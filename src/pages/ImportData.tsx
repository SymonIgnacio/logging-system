import { useState } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  writeBatch,
  query,
  where,
} from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseConfig } from "../../firebase";
import { getLocalDateString } from "../utils/dateTime";

const db = getFirestore();
let xlsxModulePromise: Promise<typeof import("xlsx")> | null = null;

type ImportMode = "replace" | "merge-skip" | "merge-update" | null;
type ActiveImportMode = Exclude<ImportMode, null>;
type ImportType = "sections" | "subjects" | "teachers" | "users" | "schedule";
type CollectionName = "sections" | "subjects" | "teachers" | "users" | "periods" | "logs";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

interface SectionMapping {
  grade: string;
  section: string;
}

interface SubjectMapping {
  subjectName: string;
}

interface TeacherMapping {
  name: string;
  subjects: string;
}

interface UserMapping {
  email: string;
  password: string;
  grade: string;
  section: string;
  role: string;
}

interface ScheduleMapping {
  teacherName: string;
  subject: string;
  grade: string;
  section: string;
  period: string;
}

const DELETE_BATCH_LIMIT = 400;

async function loadXlsx(): Promise<typeof import("xlsx")> {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import("xlsx");
  }
  return xlsxModulePromise;
}

function getCollectionForImportType(type: ImportType): CollectionName {
  switch (type) {
    case "sections":
      return "sections";
    case "subjects":
      return "subjects";
    case "teachers":
      return "teachers";
    case "users":
      return "users";
    case "schedule":
      return "periods";
  }
}

async function deleteCollectionInChunks(collectionName: CollectionName): Promise<void> {
  // Firestore batches have a write limit; delete in chunks for reliability.
  while (true) {
    const snapshot = await getDocs(collection(db, collectionName));
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.slice(0, DELETE_BATCH_LIMIT).forEach((docSnapshot) => {
      batch.delete(docSnapshot.ref);
    });
    await batch.commit();

    if (snapshot.size <= DELETE_BATCH_LIMIT) return;
  }
}

export default function ImportData() {
  const [, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [importType, setImportType] = useState<ImportType>("sections");
  const [showModeModal, setShowModeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  const [sectionMapping, setSectionMapping] = useState<SectionMapping>({ grade: "", section: "" });
  const [subjectMapping, setSubjectMapping] = useState<SubjectMapping>({ subjectName: "" });
  const [teacherMapping, setTeacherMapping] = useState<TeacherMapping>({ name: "", subjects: "" });
  const [userMapping, setUserMapping] = useState<UserMapping>({ email: "", password: "", grade: "", section: "", role: "student" });
  const [scheduleMapping, setScheduleMapping] = useState<ScheduleMapping>({ teacherName: "", subject: "", grade: "", section: "", period: "" });

  const mappingFields: Record<ImportType, string[]> = {
    sections: ["grade", "section"],
    subjects: ["subjectName"],
    teachers: ["name", "subjects"],
    users: ["email", "password", "grade", "section", "role"],
    schedule: ["teacherName", "subject", "grade", "section", "period"],
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setResult("");

    const data = await selectedFile.arrayBuffer();
    const XLSX = await loadXlsx();
    const workbook = XLSX.read(data);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
    const fileHeaders = json.length > 0 ? Object.keys(json[0]) : [];
    setHeaders(fileHeaders);
    setRows(json);
  };

  const handleMappingChange = (field: string, value: string) => {
    switch (importType) {
      case "sections":
        setSectionMapping((prev) => ({ ...prev, [field]: value }));
        break;
      case "subjects":
        setSubjectMapping((prev) => ({ ...prev, [field]: value }));
        break;
      case "teachers":
        setTeacherMapping((prev) => ({ ...prev, [field]: value }));
        break;
      case "users":
        setUserMapping((prev) => ({ ...prev, [field]: value }));
        break;
      case "schedule":
        setScheduleMapping((prev) => ({ ...prev, [field]: value }));
        break;
    }
  };

  const getMappingValue = (field: string): string => {
    switch (importType) {
      case "sections":
        return sectionMapping[field as keyof SectionMapping] || "";
      case "subjects":
        return subjectMapping[field as keyof SubjectMapping] || "";
      case "teachers":
        return teacherMapping[field as keyof TeacherMapping] || "";
      case "users":
        return userMapping[field as keyof UserMapping] || "";
      case "schedule":
        return scheduleMapping[field as keyof ScheduleMapping] || "";
    }
  };

  const handleImportClick = () => {
    if (!rows.length) {
      alert("Please select a file first.");
      return;
    }
    setShowModeModal(true);
  };

  const runImport = async (mode: ImportMode) => {
    if (!mode) return;
    setLoading(true);
    setShowModeModal(false);

    try {
      const notes: string[] = [];
      const effectiveMode: ActiveImportMode =
        mode === "replace" && importType === "users" ? "merge-update" : mode;
      let importResult: ImportResult = { success: 0, failed: 0, errors: [] };

      if (mode === "replace") {
        if (importType === "users") {
          notes.push("Replace mode for users mapped to Merge Update. Existing Firebase Auth accounts are not deleted.");
        } else {
          await deleteCollectionInChunks(getCollectionForImportType(importType));
        }
      }

      switch (importType) {
        case "sections":
          importResult = await importSections(rows, sectionMapping, effectiveMode);
          break;
        case "subjects":
          importResult = await importSubjects(rows, subjectMapping, effectiveMode);
          break;
        case "teachers":
          importResult = await importTeachers(rows, teacherMapping, effectiveMode);
          break;
        case "users":
          importResult = await importUsers(rows, userMapping, effectiveMode);
          break;
        case "schedule":
          importResult = await importSchedule(rows, scheduleMapping, effectiveMode);
          break;
      }

      const resultParts: string[] = [
        `Success: ${importResult.success}, Failed: ${importResult.failed}`,
      ];
      if (notes.length > 0) {
        resultParts.push(`Notes:\n${notes.join("\n")}`);
      }
      if (importResult.errors.length > 0) {
        resultParts.push(`Errors:\n${importResult.errors.join("\n")}`);
      }
      setResult(resultParts.join("\n"));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setResult(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWipeData = async () => {
    setLoading(true);
    setShowWipeConfirm(false);

    try {
      const exportData: Record<string, Record<string, unknown>[]> = {
        sections: [],
        subjects: [],
        teachers: [],
        periods: [],
        users: [],
        logs: [],
      };

      for (const col of Object.keys(exportData)) {
        const snapshot = await getDocs(collection(db, col));
        exportData[col] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      const XLSX = await loadXlsx();
      const wb = XLSX.utils.book_new();

      Object.entries(exportData).forEach(([sheetName, data]) => {
        const wsSheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, wsSheet, sheetName);
      });

      XLSX.writeFile(wb, `backup_${getLocalDateString(new Date())}.xlsx`);

      const collections: CollectionName[] = ["sections", "subjects", "teachers", "periods", "users", "logs"];
      for (const collectionName of collections) {
        await deleteCollectionInChunks(collectionName);
      }

      setResult("Data exported and wiped successfully!");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setResult(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <div className="panel p-4">
        <h2 className="section-title">Import Data</h2>
        <p className="muted text-sm mt-1">Upload spreadsheet files and map columns before importing.</p>
      </div>

      <div className="panel p-3">
        <h3 className="font-semibold mb-2 text-sm">Import Type</h3>
        <div className="flex flex-wrap gap-2">
          {(["sections", "subjects", "teachers", "users", "schedule"] as ImportType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                setImportType(type);
                setFile(null);
                setHeaders([]);
                setRows([]);
                setResult("");
              }}
              className={`px-3 py-2 rounded-lg capitalize text-sm ${importType === type
                ? "bg-blue-600 text-white"
                : "bg-gray-50 border border-gray-200 hover:bg-white"
                }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="panel p-3">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-gray-200 file:text-sm file:font-semibold file:bg-white file:text-blue-700 hover:file:bg-blue-50"
        />
      </div>

      {headers.length > 0 && (
        <div className="panel p-3 space-y-3">
          <h3 className="font-semibold">Map Columns</h3>
          {mappingFields[importType].map((field) => (
            <div key={field}>
              <label className="block mb-1 font-medium">{field.toUpperCase()}</label>
              <select
                className="input"
                value={getMappingValue(field)}
                onChange={(e) => handleMappingChange(field, e.target.value)}
              >
                <option value="">-- Select Column --</option>
                {headers.map((header) => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {headers.length > 0 && (
        <button
          onClick={handleImportClick}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? "Processing..." : "Import Data"}
        </button>
      )}

      {result && (
        <pre className="panel p-3 overflow-auto text-sm whitespace-pre-wrap">{result}</pre>
      )}

      <div className="panel p-4">
        <h3 className="text-base font-semibold mb-2">School Year End</h3>
        <p className="text-sm text-gray-600 mb-3">
          Export all data to Excel and wipe the database for a new school year.
        </p>
        <button
          onClick={() => setShowWipeConfirm(true)}
          disabled={loading}
          className="btn-danger disabled:opacity-50"
        >
          Export & Wipe All Data
        </button>
      </div>

      {showModeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="panel p-4 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-3">Select Import Mode</h3>
            <div className="space-y-2">
              <button
                onClick={() => { runImport("replace"); }}
                className="w-full p-3 text-left border rounded-lg hover:bg-red-50"
              >
                <strong className="text-red-600">Replace All</strong>
                <p className="text-sm text-gray-600">Clear existing data and import fresh</p>
              </button>
              <button
                onClick={() => { runImport("merge-skip"); }}
                className="w-full p-3 text-left border rounded-lg hover:bg-yellow-50"
              >
                <strong className="text-yellow-600">Merge (Skip Duplicates)</strong>
                <p className="text-sm text-gray-600">Add new items, skip if exists</p>
              </button>
              <button
                onClick={() => { runImport("merge-update"); }}
                className="w-full p-3 text-left border rounded-lg hover:bg-green-50"
              >
                <strong className="text-green-600">Merge (Update)</strong>
                <p className="text-sm text-gray-600">Add new items, update existing</p>
              </button>
            </div>
            <button
              onClick={() => setShowModeModal(false)}
              className="mt-3 w-full py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showWipeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="panel p-4 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-3 text-red-600">Confirm Wipe</h3>
            <p className="mb-4">This will export all data to Excel and then permanently delete all records. This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWipeConfirm(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeData}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Export & Wipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function importSections(rows: Record<string, unknown>[], mapping: SectionMapping, mode: ActiveImportMode): Promise<ImportResult> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const grade = String(row[mapping.grade] ?? "").trim();
    const section = String(row[mapping.section] ?? "").trim();

    if (!grade || !section) {
      failed++;
      errors.push("Missing grade or section");
      continue;
    }

    try {
      const id = `${grade}-${section}`;
      const ref = doc(db, "sections", id);
      const existingDoc = await getDoc(ref);

      if (existingDoc.exists() && mode === "merge-skip") {
        success++;
        continue;
      }

      await setDoc(ref, { grade, section });
      success++;
    } catch (err: unknown) {
      failed++;
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Error: ${errorMessage}`);
    }
  }
  return { success, failed, errors };
}

async function importSubjects(rows: Record<string, unknown>[], mapping: SubjectMapping, mode: ActiveImportMode): Promise<ImportResult> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const subjectName = String(row[mapping.subjectName] ?? "").trim();

    if (!subjectName) {
      failed++;
      errors.push("Missing subject name");
      continue;
    }

    try {
      const ref = doc(db, "subjects", subjectName);
      const existingDoc = await getDoc(ref);

      if (existingDoc.exists() && mode === "merge-skip") {
        success++;
        continue;
      }

      await setDoc(ref, { subjectName });
      success++;
    } catch (err: unknown) {
      failed++;
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Error: ${errorMessage}`);
    }
  }
  return { success, failed, errors };
}

async function importTeachers(rows: Record<string, unknown>[], mapping: TeacherMapping, mode: ActiveImportMode): Promise<ImportResult> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const name = String(row[mapping.name] ?? "").trim();
    const subjectsStr = String(row[mapping.subjects] ?? "").trim();
    const subjects = subjectsStr.split(",").map((subjectItem) => subjectItem.trim()).filter(Boolean);

    if (!name) {
      failed++;
      errors.push("Missing teacher name");
      continue;
    }

    try {
      const ref = doc(db, "teachers", name);
      const existingDoc = await getDoc(ref);

      if (existingDoc.exists() && mode === "merge-skip") {
        success++;
        continue;
      }

      await setDoc(ref, { name, subjects });
      success++;
    } catch (err: unknown) {
      failed++;
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Error: ${errorMessage}`);
    }
  }
  return { success, failed, errors };
}

async function importUsers(rows: Record<string, unknown>[], mapping: UserMapping, mode: ActiveImportMode): Promise<ImportResult> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  const secondaryAppName = "ImporterApp";
  const secondaryApp = getApps().find((app) => app.name === secondaryAppName)
    || initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  for (const row of rows) {
    const emailText = String(row[mapping.email] ?? "").trim();
    const passwordText = String(row[mapping.password] ?? "").trim();
    const grade = String(row[mapping.grade] ?? "").trim();
    const section = String(row[mapping.section] ?? "").trim();
    const roleText = mapping.role ? String(row[mapping.role] ?? "student").trim() : "student";
    const userRole = roleText === "admin" ? "admin" : "student";

    if (!emailText) {
      failed++;
      errors.push("Missing email");
      continue;
    }

    try {
      const userQuery = query(collection(db, "users"), where("email", "==", emailText));
      const existingUserSnapshot = await getDocs(userQuery);

      if (!existingUserSnapshot.empty) {
        if (mode === "merge-skip") {
          success++;
          continue;
        }

        const existingUserDoc = existingUserSnapshot.docs[0];
        await setDoc(existingUserDoc.ref, {
          email: emailText,
          grade,
          section,
          role: userRole,
        }, { merge: true });

        success++;
        continue;
      }

      if (!passwordText) {
        failed++;
        errors.push(`Missing password for new user ${emailText}`);
        continue;
      }

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, emailText, passwordText);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "users", uid), {
        email: emailText,
        grade,
        section,
        role: userRole,
      });

      await signOut(secondaryAuth);
      success++;
    } catch (err: unknown) {
      failed++;
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Error creating/updating user ${emailText}: ${errorMessage}`);
    }
  }
  return { success, failed, errors };
}

async function importSchedule(rows: Record<string, unknown>[], mapping: ScheduleMapping, mode: ActiveImportMode): Promise<ImportResult> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const teacherName = String(row[mapping.teacherName] ?? "").trim();
    const subject = String(row[mapping.subject] ?? "").trim();
    const grade = String(row[mapping.grade] ?? "").trim();
    const section = String(row[mapping.section] ?? "").trim();
    const period = String(row[mapping.period] ?? "").trim();

    if (!teacherName || !subject || !grade || !section || !period) {
      failed++;
      errors.push("Missing required fields");
      continue;
    }

    try {
      const existingQuery = query(
        collection(db, "periods"),
        where("teacher", "==", teacherName),
        where("subject", "==", subject),
        where("grade", "==", grade),
        where("section", "==", section),
        where("period", "==", period)
      );
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        if (mode === "merge-skip") {
          success++;
          continue;
        }

        const existingDoc = existingSnapshot.docs[0];
        await setDoc(existingDoc.ref, {
          teacher: teacherName,
          subject,
          grade,
          section,
          period,
        }, { merge: true });

        success++;
        continue;
      }

      await addDoc(collection(db, "periods"), {
        teacher: teacherName,
        subject,
        grade,
        section,
        period,
      });
      success++;
    } catch (err: unknown) {
      failed++;
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Error: ${errorMessage}`);
    }
  }
  return { success, failed, errors };
}

import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, arrayUnion, updateDoc, addDoc } from "firebase/firestore";
import * as XLSX from "xlsx";

const auth = getAuth();
const db = getFirestore();

/** Parse CSV or XLSX file */
export async function parseFile(file: File): Promise<{ headers: string[]; rows: any[] }> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const headers = json.length > 0 ? Object.keys(json[0]) : [];
  return { headers, rows: json };
}

/** Import Users with Firebase Auth */
export async function importUsers(
  rows: any[],
  mapping: { email: string; password: string; grade: string; section: string }
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const email = row[mapping.email];
    const password = row[mapping.password];
    const grade = row[mapping.grade];
    const section = row[mapping.section];

    if (!email || !password) {
      failed++;
      errors.push(`Missing email or password in row: ${JSON.stringify(row)}`);
      continue;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "users", uid), { email, password, grade, section });

      success++;
    } catch (err: any) {
      failed++;
      errors.push(`Error creating user ${email}: ${err.message}`);
    }
  }

  return { success, failed, errors };
}

/** Import Teachers without Firebase Auth */
export async function importTeachers(
  rows: any[],
  mapping: { name: string; grade: string; section: string; subject: string; period: string }
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const name = String(row[mapping.name] ?? "").trim();
    const grade = String(row[mapping.grade] ?? "").trim();
    const section = String(row[mapping.section] ?? "").trim();
    const subject = String(row[mapping.subject] ?? "").trim();
    const period = String(row[mapping.period] ?? "").trim();

    if (!name || !grade || !section || !subject || !period) {
      failed++;
      errors.push(`Missing required fields in row: ${JSON.stringify(row)}`);
      continue;
    }

    try {
      // 1. Teachers collection
      const teacherRef = doc(db, "teachers", name);
      const teacherSnap = await getDoc(teacherRef);

      if (teacherSnap.exists()) {
        await updateDoc(teacherRef, { subjects: arrayUnion(subject) });
      } else {
        await setDoc(teacherRef, { name, subjects: [subject] });
      }

      // 2. Periods collection (auto-ID)
      await addDoc(collection(db, "periods"), {
        teacher: name,
        grade,
        section,
        subject,
        period,
      });

      success++;
    } catch (err: any) {
      failed++;
      errors.push(`Error processing row for teacher ${name}: ${err.message}`);
    }
  }

  return { success, failed, errors };
}
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyATNm04vXuyb-DFEtO1HgKypV0_J_GXt84",
  authDomain: "radar-4ccad.firebaseapp.com",
  projectId: "radar-4ccad",
  storageBucket: "radar-4ccad.firebasestorage.app",
  messagingSenderId: "32742252441",
  appId: "1:32742252441:web:6a24809834f0e35dac7d08",
  measurementId: "G-MJB9HK44S4",
};

const REQUIRED_FIELDS = {
  users: ["email", "grade", "section", "role"],
  periods: ["teacher", "grade", "section", "subject", "period"],
  logs: ["teacher", "grade", "section", "subject", "period", "periodId", "status", "startTime", "date", "loggedBy"],
  sections: ["grade", "section"],
  subjects: ["subjectName"],
  teachers: ["name", "subjects"],
};

const VALID_ROLES = new Set(["admin", "student"]);
const VALID_LOG_STATUS = new Set(["present", "late", "absent"]);

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = args[i + 1];
    if (value && !value.startsWith("--")) {
      parsed[key] = value;
      i += 1;
    } else {
      parsed[key] = "true";
    }
  }

  return parsed;
}

function summarizeMissingFields(collectionName, docs) {
  const required = REQUIRED_FIELDS[collectionName];
  const missing = [];

  for (const entry of docs) {
    const fieldsMissing = required.filter((field) => {
      const value = entry[field];
      return value === undefined || value === null || value === "";
    });

    if (fieldsMissing.length > 0) {
      missing.push({ id: entry.id, fieldsMissing });
    }
  }

  return missing;
}

function printCollectionSummary(name, docs, missing, validationIssues) {
  console.log(`\n[${name}]`);
  console.log(`docs: ${docs.length}`);
  console.log(`missing required fields: ${missing.length}`);
  console.log(`validation issues: ${validationIssues.length}`);

  if (missing.length > 0) {
    const preview = missing.slice(0, 5);
    console.log("missing preview:", JSON.stringify(preview, null, 2));
  }

  if (validationIssues.length > 0) {
    const preview = validationIssues.slice(0, 5);
    console.log("validation preview:", JSON.stringify(preview, null, 2));
  }
}

function validateCollection(collectionName, docs) {
  const issues = [];

  if (collectionName === "users") {
    for (const row of docs) {
      if (!VALID_ROLES.has(row.role)) {
        issues.push({ id: row.id, issue: "invalid role", value: row.role });
      }
    }
  }

  if (collectionName === "logs") {
    for (const row of docs) {
      if (!VALID_LOG_STATUS.has(row.status)) {
        issues.push({ id: row.id, issue: "invalid status", value: row.status });
      }
    }
  }

  return issues;
}

function checkRelations(dataset) {
  const relationIssues = [];

  const users = dataset.users ?? [];
  const periods = dataset.periods ?? [];
  const logs = dataset.logs ?? [];
  const sections = dataset.sections ?? [];
  const subjects = dataset.subjects ?? [];
  const teachers = dataset.teachers ?? [];

  const userIds = new Set(users.map((row) => row.id));
  const periodIds = new Set(periods.map((row) => row.id));
  const sectionIds = new Set(sections.map((row) => row.id));
  const subjectIds = new Set(subjects.map((row) => row.id));
  const subjectNames = new Set(subjects.map((row) => row.subjectName));
  const teacherIds = new Set(teachers.map((row) => row.id));
  const teacherNames = new Set(teachers.map((row) => row.name));

  for (const row of logs) {
    if (row.periodId && !periodIds.has(row.periodId)) {
      relationIssues.push({ collection: "logs", id: row.id, issue: "periodId missing in periods", value: row.periodId });
    }
    if (row.loggedBy && !userIds.has(row.loggedBy)) {
      relationIssues.push({ collection: "logs", id: row.id, issue: "loggedBy missing in users", value: row.loggedBy });
    }
  }

  for (const row of users) {
    const sectionId = `${row.grade}-${row.section}`;
    if (row.grade && row.section && !sectionIds.has(sectionId)) {
      relationIssues.push({ collection: "users", id: row.id, issue: "grade-section missing in sections", value: sectionId });
    }
  }

  for (const row of periods) {
    const sectionId = `${row.grade}-${row.section}`;
    if (row.grade && row.section && !sectionIds.has(sectionId)) {
      relationIssues.push({ collection: "periods", id: row.id, issue: "grade-section missing in sections", value: sectionId });
    }
    if (row.subject && !(subjectIds.has(row.subject) || subjectNames.has(row.subject))) {
      relationIssues.push({ collection: "periods", id: row.id, issue: "subject missing in subjects", value: row.subject });
    }
    if (row.teacher && !(teacherIds.has(row.teacher) || teacherNames.has(row.teacher))) {
      relationIssues.push({ collection: "periods", id: row.id, issue: "teacher missing in teachers", value: row.teacher });
    }
  }

  return relationIssues;
}

async function loadCollection(db, name) {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function main() {
  const args = parseArgs();
  const email = args.email || process.env.FIREBASE_AUDIT_EMAIL;
  const password = args.password || process.env.FIREBASE_AUDIT_PASSWORD;

  if (!email || !password) {
    console.error("Missing credentials.");
    console.error("Usage: node scripts/firestore-audit.mjs --email <admin-email> --password <admin-password>");
    console.error("Or set FIREBASE_AUDIT_EMAIL and FIREBASE_AUDIT_PASSWORD env vars.");
    process.exit(1);
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const collections = Object.keys(REQUIRED_FIELDS);
  const dataset = {};

  try {
    const credentials = await signInWithEmailAndPassword(auth, email, password);
    console.log(`Signed in as: ${credentials.user.email}`);

    for (const collectionName of collections) {
      try {
        const docs = await loadCollection(db, collectionName);
        dataset[collectionName] = docs;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`\n[${collectionName}]`);
        console.log(`error: ${message}`);
        dataset[collectionName] = [];
      }
    }

    let totalMissing = 0;
    let totalValidationIssues = 0;

    for (const collectionName of collections) {
      const docs = dataset[collectionName];
      const missing = summarizeMissingFields(collectionName, docs);
      const validationIssues = validateCollection(collectionName, docs);

      totalMissing += missing.length;
      totalValidationIssues += validationIssues.length;

      printCollectionSummary(collectionName, docs, missing, validationIssues);
    }

    const relationIssues = checkRelations(dataset);
    console.log("\n[relations]");
    console.log(`issues: ${relationIssues.length}`);
    if (relationIssues.length > 0) {
      console.log("relation preview:", JSON.stringify(relationIssues.slice(0, 10), null, 2));
    }

    console.log("\n[audit summary]");
    console.log(`collections checked: ${collections.length}`);
    console.log(`missing-field issues: ${totalMissing}`);
    console.log(`validation issues: ${totalValidationIssues}`);
    console.log(`relation issues: ${relationIssues.length}`);

    if (totalMissing === 0 && totalValidationIssues === 0 && relationIssues.length === 0) {
      console.log("status: READY (schema and core relations look consistent)");
    } else {
      console.log("status: NOT READY (fix issues shown above)");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Audit failed: ${message}`);
    process.exitCode = 1;
  } finally {
    try {
      await signOut(auth);
    } catch {
      // no-op
    }
  }
}

void main();

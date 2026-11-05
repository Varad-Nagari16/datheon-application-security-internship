export interface TrainingRecord {
  id: string;
  ownerId: string;
  studentName: string;
  email: string;
  program: string;
  term: string;
  status: string;
  note: string;
}

// Public, synthetic training credential. It is hashed before storage in SQLite.
export const DEMO_PASSWORD = "northstar-demo-2026";

// Fictional fixtures only; the database initializer seeds them into separate
// users and applications tables with a foreign-key owner relationship.
export const trainingRecords: TrainingRecord[] = [
  {
    id: "104",
    ownerId: "user-a",
    studentName: "Student A",
    email: "student.a@example.test",
    program: "Cybersecurity Foundations",
    term: "Autumn 2026",
    status: "Application in review",
    note: "Synthetic private note for Student A.",
  },
  {
    id: "105",
    ownerId: "user-b",
    studentName: "Student B",
    email: "student.b@example.test",
    program: "Software Engineering",
    term: "Autumn 2026",
    status: "Documents received",
    note: "Synthetic private note for Student B.",
  },
  {
    id: "106",
    ownerId: "user-c",
    studentName: "Student C",
    email: "student.c@example.test",
    program: "Information Systems",
    term: "Spring 2027",
    status: "Interview scheduled",
    note: "Synthetic private note for Student C.",
  },
  {
    id: "107",
    ownerId: "user-d",
    studentName: "Student D",
    email: "student.d@example.test",
    program: "Computer Science",
    term: "Spring 2027",
    status: "Submitted",
    note: "Synthetic private note for Student D.",
  },
  {
    id: "108",
    ownerId: "user-e",
    studentName: "Student E",
    email: "student.e@example.test",
    program: "Data Analytics",
    term: "Autumn 2026",
    status: "Action required",
    note: "Synthetic private note for Student E.",
  },
];

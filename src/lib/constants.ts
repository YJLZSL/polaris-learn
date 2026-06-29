import { BookOpen, Calculator, FlaskConical, Globe, Languages, Microscope } from "lucide-react";

export interface SubjectConfig {
  id: string;
  label: string;
  icon: typeof BookOpen;
}

export const SUBJECTS: SubjectConfig[] = [
  { id: "math", label: "数学", icon: Calculator },
  { id: "chinese", label: "语文", icon: BookOpen },
  { id: "english", label: "英语", icon: Languages },
  { id: "physics", label: "物理", icon: FlaskConical },
  { id: "chemistry", label: "化学", icon: Microscope },
  { id: "biology", label: "生物", icon: Globe },
];

export const SUBJECT_MAP: Record<string, SubjectConfig> = Object.fromEntries(
  SUBJECTS.map((s) => [s.id, s])
);

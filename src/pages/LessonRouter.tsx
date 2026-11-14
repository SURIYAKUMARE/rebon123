import { useParams, Navigate } from "react-router-dom";
import InteractiveLesson from "./InteractiveLesson";
import StudentBoardLesson from "./StudentBoardLesson";
import ProfessionalConsoleLesson from "./ProfessionalConsoleLesson";
import { ConsoleLessonErrorBoundary } from "@/components/cloud/professionalMode/ConsoleLessonErrorBoundary";

/** SM-D* → Student board; PM-* → Professional console; communication lessons only. */
export default function LessonRouter() {
  const { id } = useParams();
  if (id && /^SM-D\d+/i.test(id)) {
    return <StudentBoardLesson />;
  }
  if (id && /^PM-\d/i.test(id)) {
    return (
      <ConsoleLessonErrorBoundary
        onRetry={() => window.location.reload()}
      >
        <ProfessionalConsoleLesson />
      </ConsoleLessonErrorBoundary>
    );
  }
  if (id && /^lesson_/i.test(id)) {
    return <InteractiveLesson />;
  }
  return <Navigate to="/learning" replace />;
}

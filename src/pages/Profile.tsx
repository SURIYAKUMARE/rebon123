import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDomain } from "@/contexts/DomainContext";
import DomainNavbar from "@/components/app/DomainNavbar";
import { CloudProofView } from "@/components/proof/CloudProofView";
import RenMentorDrawer from "@/components/mentor/RenMentorDrawer";
import { AUTH_REQUIRED } from "@/lib/authGate";

const Profile = () => {
  const { user, loading } = useAuth();
  const { setSection } = useDomain();
  const navigate = useNavigate();

  useEffect(() => {
    setSection("profile");
  }, [setSection]);

  useEffect(() => {
    if (AUTH_REQUIRED && !loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (AUTH_REQUIRED && loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DomainNavbar />
      <CloudProofView />
      <RenMentorDrawer />
    </div>
  );
};

export default Profile;

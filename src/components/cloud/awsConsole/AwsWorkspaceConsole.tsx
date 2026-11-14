import { useCallback, useState } from "react";
import { TeachableAwsConsole } from "@/components/cloud/professionalMode/TeachableAwsConsole";
import { useAccountStore } from "@/components/cloud/awsConsole/cloudscape/store";
import { AwsAccountSignup, iamUsernameFromEmail } from "./AwsAccountSignup";
import { loadAwsAccount, type SavedAwsAccount } from "./awsAccountStorage";

type Props = {
  onBack: () => void;
  /** Service the ticket is about. Home when the mail is a console-navigation task. */
  initialView?: "home" | "iam" | "ec2" | "s3" | "vpc" | "cloudwatch" | "billing";
  ticket?: {
    from?: string;
    subject?: string;
    body?: string;
    priority?: string;
  } | null;
  /** Shown after the student has done the console work and should write the reply. */
  onFinished?: () => void;
};

/** Work workspace: create/sign in to your own AWS sandbox, then open Console Home. */
export function AwsWorkspaceConsole({
  onBack,
  initialView = "home",
  ticket = null,
  onFinished,
}: Props) {
  const [account, setAccount] = useState<SavedAwsAccount | null>(() =>
    loadAwsAccount()
  );
  const [consoleKey, setConsoleKey] = useState(0);
  const visualMode = useAccountStore((s) => s.visualMode);

  const handleComplete = useCallback((saved: SavedAwsAccount) => {
    setAccount(saved);
    setConsoleKey((k) => k + 1);
  }, []);

  if (!account) {
    return <AwsAccountSignup onComplete={handleComplete} onBack={onBack} />;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: visualMode === "dark" ? "#0f1419" : "#f2f3f3" }}
    >
      <div className="min-h-0 flex-1">
        <TeachableAwsConsole
          key={`${account.accountId}-${consoleKey}`}
          accountId={ticket ? "847291635028" : account.accountId}
          accountName={ticket ? "finova-dev" : account.accountName}
          region={ticket ? "us-east-1" : account.region}
          studentControl
          mode="work"
          fresh={!ticket}
          preset={ticket ? "finova" : "empty"}
          initialView={initialView}
          ticket={ticket}
          iamUsername={iamUsernameFromEmail(account.email)}
          onExitToWorkspace={onBack}
        />
      </div>
      {onFinished ? (
        <button
          type="button"
          onClick={onFinished}
          className="fixed bottom-5 right-5 z-[80] rounded-full bg-[#ff9900] px-4 py-2.5 text-sm font-semibold text-[#232f3e] shadow-lg"
        >
          Exit console and reply
        </button>
      ) : null}
    </div>
  );
}

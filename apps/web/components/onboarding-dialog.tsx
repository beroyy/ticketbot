import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading-spinner";
import { FaDiscord } from "react-icons/fa6";
import { ChevronRight } from "lucide-react";

type OnboardingDialogProps = {
  title?: string;
  description?: string;
  onButtonPress: () => void;
  isLoading?: boolean;
  buttonDisabled?: boolean;
  buttonText?: string;
};

export function OnboardingDialog({
  title,
  description,
  isLoading,
  onButtonPress,
  buttonDisabled,
  buttonText,
}: OnboardingDialogProps) {
  return (
    <div className="rounded-20 fixed left-1/2 top-1/2 z-20 w-[35rem] -translate-x-1/2 -translate-y-1/2 border bg-white p-6 pt-12 shadow-lg">
      <div className="flex flex-col items-center gap-5 text-center">
        <Image src="/shiny-icon.png" alt="shiny-icon" width={70} height={70} className="mr-2" />
        <div className="space-y-2">
          <h2 className="text-strong-black text-pretty text-3xl font-semibold tracking-tight">
            {title ?? "Sign in with Discord"}
          </h2>
          <p className="text-sub-gray text-pretty tracking-tight">
            {description ?? "Connect your Discord account to manage support tickets"}
          </p>
        </div>
        <Button
          className="bg-dark-faded-blue hover:bg-dark-faded-blue/95 active:bg-dark-faded-blue/90 group flex w-full items-center justify-center gap-2 rounded-xl px-4 py-5 font-medium text-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C7EDB] focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-95"
          onClick={onButtonPress}
          disabled={buttonDisabled}
          data-signin-button
        >
          {isLoading ? (
            <LoadingSpinner className="size-5 animate-spin opacity-50 [-webkit-mask-image:linear-gradient(to_bottom,transparent,white)] [mask-image:linear-gradient(to_top,transparent,white)]" />
          ) : (
            <>
              <FaDiscord className="size-5" />
              {buttonText}
              <ChevronRight className="size-4" strokeWidth={2.5} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

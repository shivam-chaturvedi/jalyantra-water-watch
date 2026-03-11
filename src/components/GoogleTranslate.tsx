import { Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const GOOGLE_SCRIPT_ID = "google-translate-script";

const languages = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "bn", label: "Bengali" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "mr", label: "Marathi" },
  { code: "gu", label: "Gujarati" },
];

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

const loadGoogleTranslateScript = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById(GOOGLE_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = GOOGLE_SCRIPT_ID;
  script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.body.appendChild(script);
};

interface GoogleTranslateDropdownProps {
  className?: string;
}

const GoogleTranslateDropdown = ({ className }: GoogleTranslateDropdownProps) => {
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;

      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: languages.map((language) => language.code).join(","),
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        "google_translate_element"
      );
    };

    if (window.google?.translate?.TranslateElement) {
      window.googleTranslateElementInit?.();
    }

    loadGoogleTranslateScript();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let poller: number | undefined;

    const applyLanguage = () => {
      const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (!combo) return false;
      combo.value = selectedLanguage;
      combo.dispatchEvent(new Event("change"));
      return true;
    };

    if (!applyLanguage()) {
      poller = window.setInterval(() => {
        if (applyLanguage() && poller) {
          window.clearInterval(poller);
          poller = undefined;
        }
      }, 400);
    }

    return () => {
      if (poller) {
        window.clearInterval(poller);
      }
    };
  }, [selectedLanguage]);

  return (
    <div
      className={cn(
        "flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground",
        className
      )}
    >
      
      
      <div id="google_translate_element" className="hidden" aria-hidden="true" />
    </div>
  );
};

export default GoogleTranslateDropdown;

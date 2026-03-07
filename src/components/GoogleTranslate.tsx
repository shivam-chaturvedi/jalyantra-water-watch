import { useEffect, useState } from "react";

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

const GoogleTranslateDropdown = () => {
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
      window.googleTranslateElementInit();
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
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
        Translate
      </span>
      <select
        value={selectedLanguage}
        onChange={(event) => setSelectedLanguage(event.target.value)}
        className="rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground outline-none transition focus:ring-2 focus:ring-inset focus:ring-[#0c7a61]"
        aria-label="Translate JalYantra site"
      >
        {languages.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
      <div id="google_translate_element" className="hidden" aria-hidden="true" />
    </div>
  );
};

export default GoogleTranslateDropdown;

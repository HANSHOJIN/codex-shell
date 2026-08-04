import React from "react";
import ShellLayout from "./components/ShellLayout";

type Theme = "system" | "light" | "dark";
type Language = "zh-CN" | "en";

type AppearancePreferences = {
  theme: Theme;
  language: Language;
  showMenuBar: boolean;
  translucentSidebar: boolean;
  reduceMotion: boolean;
  uiSize: number;
};

const APPEARANCE_STORAGE_KEY = "co-shell.appearance";
const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: "system",
  language: "zh-CN",
  showMenuBar: true,
  translucentSidebar: false,
  reduceMotion: false,
  uiSize: 14,
};

function loadAppearance(): AppearancePreferences {
  try {
    const saved = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<AppearancePreferences>;
      return {
        theme: parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "system" ? parsed.theme : "system",
        language: parsed.language === "en" ? "en" : "zh-CN",
        showMenuBar: parsed.showMenuBar !== false,
        translucentSidebar: parsed.translucentSidebar === true,
        reduceMotion: parsed.reduceMotion === true,
        uiSize: parsed.uiSize === 13 || parsed.uiSize === 15 ? parsed.uiSize : 14,
      };
    }

    const legacyTheme = window.localStorage.getItem("co-shell.theme");
    if (legacyTheme === "light" || legacyTheme === "dark" || legacyTheme === "system") {
      return { ...DEFAULT_APPEARANCE, theme: legacyTheme };
    }
  } catch {
    // Preferences fall back to safe defaults when storage is unavailable.
  }
  return DEFAULT_APPEARANCE;
}

function EmptySlot({ label }: { label: string }) {
  return <div className="empty-slot" aria-label={label} />;
}

function FilesPlaceholder({ language }: { language: Language }) {
  const isEnglish = language === "en";
  return (
    <div className="files-placeholder" aria-label={isEnglish ? "Files area" : "文件区域"}>
      <span>{isEnglish ? "No files" : "暂无文件"}</span>
    </div>
  );
}

function AppearanceSettings({
  value,
  onChange,
}: {
  value: AppearancePreferences;
  onChange: (next: AppearancePreferences) => void;
}) {
  const isEnglish = value.language === "en";
  const update = <K extends keyof AppearancePreferences>(key: K, next: AppearancePreferences[K]) => {
    onChange({ ...value, [key]: next });
  };

  const themes: Array<[Theme, string]> = isEnglish
    ? [["system", "System"], ["light", "Light"], ["dark", "Dark"]]
    : [["system", "系统"], ["light", "浅色"], ["dark", "深色"]];

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <div>
          <div className="settings-eyebrow">{isEnglish ? "Settings" : "设置"}</div>
          <h1>{isEnglish ? "Appearance" : "外观"}</h1>
        </div>
      </div>

      <section className="settings-section">
        <h2>{isEnglish ? "Theme" : "主题"}</h2>
        <div className="theme-grid">
          {themes.map(([theme, label]) => (
            <button key={theme} className={`theme-card ${value.theme === theme ? "is-selected" : ""}`} onClick={() => update("theme", theme)}>
              <span className={`theme-preview theme-${theme}`}><i /><b /><em /></span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section settings-card">
        <div className="settings-card-title"><strong>{isEnglish ? "Interface" : "界面"}</strong><span>Codex Style</span></div>
        <SettingRow
          label={isEnglish ? "Language" : "语言"}
          description={isEnglish ? "Choose the display language" : "选择界面显示语言"}
        >
          <select aria-label={isEnglish ? "Language" : "语言"} value={value.language} onChange={(event) => update("language", event.target.value as Language)}>
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
          </select>
        </SettingRow>
        <SettingRow
          label={isEnglish ? "Show menu bar" : "显示菜单栏"}
          description={isEnglish ? "Show the placeholder menus at the top" : "显示顶部的占位菜单"}
        >
          <Toggle checked={value.showMenuBar} onChange={(next) => update("showMenuBar", next)} label={isEnglish ? "Show menu bar" : "显示菜单栏"} />
        </SettingRow>
        <SettingRow
          label={isEnglish ? "Translucent sidebar" : "半透明侧边栏"}
          description={isEnglish ? "Blend the sidebar softly with the window background" : "让左侧栏与窗口背景产生轻微的透明融合效果"}
        >
          <Toggle checked={value.translucentSidebar} onChange={(next) => update("translucentSidebar", next)} label={isEnglish ? "Translucent sidebar" : "半透明侧边栏"} />
        </SettingRow>
        <SettingRow
          label={isEnglish ? "Reduce motion" : "减少动态效果"}
          description={isEnglish ? "Reduce panel opening, closing, and switching animations" : "减少面板展开、收起和切换时的动画"}
        >
          <Toggle checked={value.reduceMotion} onChange={(next) => update("reduceMotion", next)} label={isEnglish ? "Reduce motion" : "减少动态效果"} />
        </SettingRow>
        <SettingRow
          label={isEnglish ? "Interface font size" : "界面字号"}
          description={isEnglish ? "Adjust the base size of menus and interface text" : "调整菜单与界面文字的基础字号"}
        >
          <select aria-label={isEnglish ? "Interface font size" : "界面字号"} value={value.uiSize} onChange={(event) => update("uiSize", Number(event.target.value))}>
            <option value={13}>13 px</option>
            <option value={14}>14 px</option>
            <option value={15}>15 px</option>
          </select>
        </SettingRow>
      </section>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button className={`toggle ${checked ? "is-on" : ""}`} onClick={() => onChange(!checked)} aria-label={label} aria-pressed={checked}><span /></button>;
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return <div className="setting-row"><div><strong>{label}</strong><small>{description}</small></div>{children}</div>;
}

function App() {
  const [appearance, setAppearance] = React.useState<AppearancePreferences>(loadAppearance);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = appearance.theme === "system" ? (media.matches ? "dark" : "light") : appearance.theme;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.lang = appearance.language;
      document.documentElement.style.setProperty("--ui-font-size", `${appearance.uiSize}px`);
      document.documentElement.classList.toggle("reduce-motion", appearance.reduceMotion);
      document.documentElement.classList.toggle("translucent-sidebar", appearance.translucentSidebar);
    };

    apply();
    try {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
      window.localStorage.setItem("co-shell.theme", appearance.theme);
    } catch {
      // Applying preferences does not depend on persistence succeeding.
    }
    if (appearance.theme === "system") media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [appearance]);

  const isEnglish = appearance.language === "en";

  return (
    <ShellLayout
      title="CodexShell"
      appName="YourApp"
      language={appearance.language}
      showMenuBar={appearance.showMenuBar}
      settings={<AppearanceSettings value={appearance} onChange={setAppearance} />}
      left={<EmptySlot label={isEnglish ? "Sidebar content placeholder" : "左侧栏内容占位"} />}
      main={<EmptySlot label={isEnglish ? "YourApp main area" : "YourApp 主区域"} />}
      right={<FilesPlaceholder language={appearance.language} />}
      bottom={<EmptySlot label={isEnglish ? "Bottom panel content placeholder" : "底部面板内容占位"} />}
    />
  );
}

export default App;

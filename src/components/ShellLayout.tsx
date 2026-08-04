import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  ArrowLeft,
  ChevronUp,
  CircleHelp,
  Minus,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Settings,
  Square,
  Sun,
  X,
} from "lucide-react";

type DragKind = "left" | "right" | "bottom";

export type ShellLayoutProps = {
  title?: string;
  appName?: string;
  language?: "zh-CN" | "en";
  showMenuBar?: boolean;
  left: ReactNode;
  main: ReactNode;
  right: ReactNode;
  bottom: ReactNode;
  settings?: ReactNode;
};

const LEFT_DEFAULT = 260;
const RIGHT_DEFAULT = 300;
const BOTTOM_DEFAULT = 210;
const MIN_SIDE = 190;
const MIN_BOTTOM = 120;
const LAYOUT_STORAGE_KEY = "codex-shell.layout";
const LEGACY_LAYOUT_STORAGE_KEY = "co-shell.layout";

type LayoutState = {
  leftOpen: boolean;
  rightOpen: boolean;
  bottomOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  bottomHeight: number;
};

function loadLayoutState(): Partial<LayoutState> {
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
      ?? window.localStorage.getItem(LEGACY_LAYOUT_STORAGE_KEY);
    return raw ? JSON.parse(raw) as Partial<LayoutState> : {};
  } catch {
    return {};
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function IconButton({ label, onClick, children, className = "" }: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button className={`icon-button ${className}`} onClick={onClick} title={label} aria-label={label}>
      {children}
    </button>
  );
}

function WindowButton({ label, onClick, children, danger = false }: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button className={`window-button${danger ? " danger" : ""}`} onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  );
}

function SidebarFooter({ onSettings, language }: { onSettings: () => void; language: "zh-CN" | "en" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const isEnglish = language === "en";

  return (
    <div className="sidebar-footer">
      {menuOpen && (
        <div className="sidebar-menu" role="menu">
          <button className="sidebar-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); onSettings(); }}>
            <Settings className="sidebar-menu-icon" size={15} />
            <span>{isEnglish ? "Settings" : "设置"}</span>
          </button>
        </div>
      )}
      {versionOpen && <div className="sidebar-version" role="status">CodexShell 0.1</div>}
      <div className="sidebar-footer-row">
        <button className="sidebar-account" onClick={() => { setVersionOpen(false); setMenuOpen((value) => !value); }} aria-expanded={menuOpen}>
          <span className="sidebar-avatar">CS</span>
          <span>YourMenu</span>
          <ChevronUp className={menuOpen ? "" : "is-down"} size={14} />
        </button>
        <button className="sidebar-help" title={isEnglish ? "Version information" : "版本信息"} aria-label={isEnglish ? "Version information" : "版本信息"} aria-expanded={versionOpen} onClick={() => { setMenuOpen(false); setVersionOpen((value) => !value); }}>
          <CircleHelp size={15} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}

function SettingsSidebar({ onBack, language }: { onBack: () => void; language: "zh-CN" | "en" }) {
  const isEnglish = language === "en";
  return (
    <div className="settings-sidebar" aria-label={isEnglish ? "Settings navigation" : "设置导航"}>
      <button className="settings-return" onClick={onBack}>
        <ArrowLeft size={14} />
        <span>{isEnglish ? "Back to app" : "返回应用"}</span>
      </button>
      <div className="settings-nav-label">{isEnglish ? "Settings" : "设置"}</div>
      <button className="settings-nav-item is-selected" aria-current="page">
        <Sun size={15} />
        <span>{isEnglish ? "Appearance" : "外观"}</span>
      </button>
    </div>
  );
}

function ShellLayout({ title = "CodexShell", appName = "YourApp", language = "zh-CN", showMenuBar = true, left, main, right, bottom, settings }: ShellLayoutProps) {
  const isEnglish = language === "en";
  const initial = useRef<Partial<LayoutState> | null>(null);
  if (initial.current === null) initial.current = loadLayoutState();
  const saved = initial.current;
  const [leftOpen, setLeftOpen] = useState(saved.leftOpen ?? true);
  const [rightOpen, setRightOpen] = useState(saved.rightOpen ?? true);
  const [bottomOpen, setBottomOpen] = useState(saved.bottomOpen ?? true);
  const [leftWidth, setLeftWidth] = useState(saved.leftWidth ?? LEFT_DEFAULT);
  const [rightWidth, setRightWidth] = useState(saved.rightWidth ?? RIGHT_DEFAULT);
  const [bottomHeight, setBottomHeight] = useState(saved.bottomHeight ?? BOTTOM_DEFAULT);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragging, setDragging] = useState<DragKind | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const keepLayoutInsideWindow = () => {
      const bounds = shell.getBoundingClientRect();
      const openSides = Number(leftOpen) + Number(rightOpen);
      if (openSides > 0) {
        const availableForSides = Math.max(MIN_SIDE * openSides, bounds.width - 240);
        if (leftOpen && rightOpen && leftWidth + rightWidth > availableForSides) {
          const ratio = leftWidth / (leftWidth + rightWidth);
          const nextLeft = clamp(availableForSides * ratio, MIN_SIDE, availableForSides - MIN_SIDE);
          setLeftWidth(Math.round(nextLeft));
          setRightWidth(Math.round(availableForSides - nextLeft));
        } else if (leftOpen && !rightOpen) {
          setLeftWidth((value) => Math.min(value, availableForSides));
        } else if (rightOpen && !leftOpen) {
          setRightWidth((value) => Math.min(value, availableForSides));
        }
      }

      if (bottomOpen) {
        setBottomHeight((value) => Math.min(value, Math.max(MIN_BOTTOM, bounds.height - 170)));
      }
    };

    keepLayoutInsideWindow();
    const observer = new ResizeObserver(keepLayoutInsideWindow);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [bottomOpen, leftOpen, leftWidth, rightOpen, rightWidth]);

  const startDrag = useCallback((kind: DragKind, event: React.PointerEvent) => {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    setDragging(kind);
  }, []);

  const resizeWithKeyboard = useCallback((kind: DragKind, event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 32 : 8;
    let handled = true;
    if (kind === "left") {
      if (event.key === "ArrowRight") setLeftWidth((value) => clamp(value + step, MIN_SIDE, 420));
      else if (event.key === "ArrowLeft") setLeftWidth((value) => clamp(value - step, MIN_SIDE, 420));
      else if (event.key === "Home") setLeftOpen(false);
      else if (event.key === "End") { setLeftOpen(true); setLeftWidth(420); }
      else handled = false;
    } else if (kind === "right") {
      if (event.key === "ArrowLeft") setRightWidth((value) => clamp(value + step, MIN_SIDE, 440));
      else if (event.key === "ArrowRight") setRightWidth((value) => clamp(value - step, MIN_SIDE, 440));
      else if (event.key === "Home") setRightOpen(false);
      else if (event.key === "End") { setRightOpen(true); setRightWidth(440); }
      else handled = false;
    } else {
      if (event.key === "ArrowUp") setBottomHeight((value) => clamp(value + step, MIN_BOTTOM, 600));
      else if (event.key === "ArrowDown") setBottomHeight((value) => clamp(value - step, MIN_BOTTOM, 600));
      else if (event.key === "Home") setBottomOpen(false);
      else if (event.key === "End") { setBottomOpen(true); setBottomHeight(600); }
      else handled = false;
    }
    if (handled) event.preventDefault();
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => {
      const bounds = shellRef.current?.getBoundingClientRect();
      if (!bounds) return;
      if (dragging === "left") {
        const next = event.clientX - bounds.left;
        if (next < MIN_SIDE * 0.62) { setDragging(null); setLeftOpen(false); }
        else { setLeftOpen(true); setLeftWidth(clamp(next, MIN_SIDE, 420)); }
      }
      if (dragging === "right") {
        const next = bounds.right - event.clientX;
        if (next < MIN_SIDE * 0.62) { setDragging(null); setRightOpen(false); }
        else { setRightOpen(true); setRightWidth(clamp(next, MIN_SIDE, 440)); }
      }
      if (dragging === "bottom") {
        const next = bounds.bottom - event.clientY;
        if (next < MIN_BOTTOM * 0.62) { setDragging(null); setBottomOpen(false); }
        else { setBottomOpen(true); setBottomHeight(clamp(next, MIN_BOTTOM, Math.max(180, bounds.height * 0.6))); }
      }
    };
    const stop = () => setDragging(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("pointercancel", stop, { once: true });
    window.addEventListener("blur", stop, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
    };
  }, [dragging]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({ leftOpen, rightOpen, bottomOpen, leftWidth, rightWidth, bottomHeight } satisfies LayoutState));
    } catch {
      // Layout persistence is best-effort.
    }
  }, [leftOpen, rightOpen, bottomOpen, leftWidth, rightWidth, bottomHeight]);

  const layoutStyle = {
    "--left-width": leftOpen ? `${leftWidth}px` : "0px",
    "--right-width": rightOpen ? `${rightWidth}px` : "0px",
    "--bottom-height": bottomOpen ? `${bottomHeight}px` : "0px",
  } as React.CSSProperties;

  return (
    <div className="window-shell" style={layoutStyle}>
      <header className="window-chrome" data-tauri-drag-region>
        <div className="window-chrome-left" data-tauri-drag-region>
          <WindowButton label={isEnglish ? "Toggle sidebar" : "切换左侧栏"} onClick={() => setLeftOpen((value) => !value)}><PanelLeft size={15} /></WindowButton>
          <span className="window-brand" data-tauri-drag-region>{title}</span>
          {showMenuBar && (
            <nav className="window-menu" aria-label={isEnglish ? "Application menu placeholders" : "应用菜单占位符"}>
              {(isEnglish ? ["File", "Edit", "View", "Help"] : ["文件", "编辑", "视图", "帮助"]).map((item) => (
                <button key={item} type="button" aria-disabled="true">{item}</button>
              ))}
            </nav>
          )}
        </div>
        <div className="window-chrome-right" data-tauri-drag-region="false">
          <WindowButton label={isEnglish ? "Minimize" : "最小化"} onClick={() => void getCurrentWindow().minimize()}><Minus size={14} /></WindowButton>
          <WindowButton label={isEnglish ? "Maximize" : "最大化"} onClick={() => void getCurrentWindow().toggleMaximize()}><Square size={12} /></WindowButton>
          <WindowButton label={isEnglish ? "Close" : "关闭"} danger onClick={() => void getCurrentWindow().close()}><X size={14} /></WindowButton>
        </div>
      </header>
      <div ref={shellRef} className={`app-shell ${dragging ? `is-dragging drag-${dragging}` : ""}`}>
        <aside className={`panel left-panel ${leftOpen ? "is-open" : "is-closed"}`} aria-hidden={!leftOpen} inert={!leftOpen}>
          {settingsOpen ? (
            <SettingsSidebar onBack={() => setSettingsOpen(false)} language={language} />
          ) : (
            <>
              <div className="panel-toolbar left-toolbar"><span className="app-title">{appName}</span></div>
              <div className="left-content">{left}</div>
              <SidebarFooter onSettings={() => setSettingsOpen(true)} language={language} />
            </>
          )}
        </aside>

        {leftOpen && <div className="resize-handle vertical left-handle" role="separator" tabIndex={0} aria-orientation="vertical" aria-label="调整左侧栏宽度" onPointerDown={(e) => startDrag("left", e)} onKeyDown={(e) => resizeWithKeyboard("left", e)} />}

        <main className="center-area">
          <div className="center-toolbar">
            {!leftOpen && <IconButton label={isEnglish ? "Show sidebar" : "展开左侧栏"} onClick={() => setLeftOpen(true)} className="left-restore"><PanelLeft size={15} /></IconButton>}
            <span className="center-label">{isEnglish ? "Main area" : "主区域"}</span>
            <div className="toolbar-actions">
              <IconButton label={isEnglish ? (bottomOpen ? "Hide bottom panel" : "Show bottom panel") : (bottomOpen ? "收起底部面板" : "展开底部面板")} onClick={() => setBottomOpen((value) => !value)} className={bottomOpen ? "is-active" : ""}><PanelBottom size={15} /></IconButton>
              <IconButton label={isEnglish ? (rightOpen ? "Hide files panel" : "Show files panel") : (rightOpen ? "收起文件栏" : "展开文件栏")} onClick={() => setRightOpen((value) => !value)} className={rightOpen ? "is-active" : ""}><PanelRight size={15} /></IconButton>
            </div>
          </div>
          <section className="main-placeholder">{settingsOpen && settings ? settings : main}</section>
          {bottomOpen && <div className="resize-handle horizontal bottom-handle" role="separator" tabIndex={0} aria-orientation="horizontal" aria-label="调整底部面板高度" onPointerDown={(e) => startDrag("bottom", e)} onKeyDown={(e) => resizeWithKeyboard("bottom", e)} />}
          <section className={`bottom-panel ${bottomOpen ? "is-open" : "is-closed"}`} aria-hidden={!bottomOpen} inert={!bottomOpen}>
            <div className="bottom-toolbar"><span>{title}</span></div>
            {bottom}
          </section>
        </main>

        {rightOpen && <div className="resize-handle vertical right-handle" role="separator" tabIndex={0} aria-orientation="vertical" aria-label="调整右侧栏宽度" onPointerDown={(e) => startDrag("right", e)} onKeyDown={(e) => resizeWithKeyboard("right", e)} />}
        <aside className={`panel right-panel ${rightOpen ? "is-open" : "is-closed"}`} aria-hidden={!rightOpen} inert={!rightOpen}>
          <div className="panel-toolbar right-toolbar"><span>{isEnglish ? "Files" : "文件"}</span><IconButton label={isEnglish ? "Hide files panel" : "收起文件栏"} onClick={() => setRightOpen(false)}><PanelRight size={15} /></IconButton></div>
          {right}
        </aside>
      </div>
    </div>
  );
}

export default ShellLayout;

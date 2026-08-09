import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  CircleHelp,
  Copy,
  ChevronDown,
  Globe2,
  Maximize2,
  MessageSquare,
  Minimize2,
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
  closeAction?: "tray" | "exit";
  left: ReactNode;
  main: ReactNode;
  right: ReactNode;
  bottom: ReactNode;
  settings?: ReactNode;
};

export function ShellNavigation({ language = "zh-CN", selected, onSelect }: { language?: "zh-CN" | "en"; selected?: string | null; onSelect?: (id: string) => void }) {
  const isEnglish = language === "en";
  const [openGroups, setOpenGroups] = useState({ first: true, second: false });
  const toggle = (group: "first" | "second") => setOpenGroups((value) => ({ ...value, [group]: !value[group] }));
  const mainItems = isEnglish ? ["Menu 1", "Menu 2"] : ["\u83dc\u53551", "\u83dc\u53552"];
  const submenuItems = isEnglish ? ["Submenu 1", "Submenu 2"] : ["\u5b50\u83dc\u53551", "\u5b50\u83dc\u53552"];

  return (
    <nav className="left-navigation" aria-label={isEnglish ? "Shell navigation" : "壳导航"}>
      <button className={`nav-item ${selected === "menu1" ? "is-selected" : ""}`} type="button" onClick={() => onSelect?.("menu1")}><MessageSquare size={15} /><span>{mainItems[0]}</span></button>
      <button className={`nav-item ${selected === "menu2" ? "is-selected" : ""}`} type="button" onClick={() => onSelect?.("menu2")}><Globe2 size={15} /><span>{mainItems[1]}</span></button>
      <NavGroup label={isEnglish ? "Pinned" : "\u7f6e\u9876"} open={openGroups.first} onToggle={() => toggle("first")} items={submenuItems} onSelect={onSelect} groupId="sub1" selected={selected} />
      <NavGroup label={isEnglish ? "Projects" : "\u9879\u76ee"} open={openGroups.second} onToggle={() => toggle("second")} items={submenuItems} onSelect={onSelect} groupId="sub2" selected={selected} />
    </nav>
  );
}

function NavGroup({ label, open, onToggle, items, onSelect, groupId, selected }: { label: string; open: boolean; onToggle: () => void; items: string[]; onSelect?: (id: string) => void; groupId: string; selected?: string | null }) {
  return (
    <div className={`nav-group ${open ? "is-open" : ""}`}>
      <button className="nav-group-button" type="button" onClick={onToggle} aria-expanded={open}>
        <span>{label}</span><ChevronDown className="nav-group-chevron" size={13} />
      </button>
      <div className="nav-group-content" aria-hidden={!open}>
        <div className="nav-group-content-inner">
          {items.map((item, index) => { const id = `${groupId}-${index + 1}`; return <button className={`nav-subitem ${selected === id ? "is-selected" : ""}`} type="button" key={id} onClick={() => onSelect?.(id)}><span>{item}</span></button>; })}
        </div>
      </div>
    </div>
  );
}

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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const isEnglish = language === "en";

  return (
    <div className="sidebar-footer">
      {accountMenuOpen && (
        <div className="sidebar-menu" role="menu">
          <button className="sidebar-menu-item" role="menuitem" onClick={() => { setAccountMenuOpen(false); onSettings(); }}>
            <Settings className="sidebar-menu-icon" size={15} />
            <span>{isEnglish ? "Settings" : "设置"}</span>
          </button>
        </div>
      )}
      {helpMenuOpen && (
        <div className="sidebar-menu" role="menu">
          <button className="sidebar-menu-item" role="menuitem" onClick={() => { setHelpMenuOpen(false); setAboutOpen(true); }}>
            <CircleHelp className="sidebar-menu-icon" size={15} />
            <span>{isEnglish ? "About CodexShell" : "关于 CodexShell"}</span>
          </button>
        </div>
      )}
      {aboutOpen && (
        <div className="about-backdrop" role="presentation" onMouseDown={() => setAboutOpen(false)}>
          <section className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="about-close" type="button" aria-label={isEnglish ? "Close" : "关闭"} onClick={() => setAboutOpen(false)}><X size={15} /></button>
            <div className="about-mark">CS</div>
            <h2 id="about-title">CodexShell</h2>
            <p className="about-version">CodexShell 0.1.3</p>
            <p>UI shell by CodexShell</p>
            <a href="https://github.com/HANSHOJIN/codex-shell" onClick={(event) => { event.preventDefault(); void openUrl("https://github.com/HANSHOJIN/codex-shell"); }}>github.com/HANSHOJIN/codex-shell</a>
            <p className="about-license">{isEnglish ? "This framework is open source and free to use. Please keep the CodexShell name and project address when using it, so more people can discover the project. Thank you." : "\u672c\u6846\u67b6\u4e3a\u5f00\u6e90\u514d\u8d39\u3002\u5982\u679c\u4f7f\u7528\uff0c\u8bf7\u4fdd\u7559 CodexShell \u5b57\u6837\u548c\u9879\u76ee\u5730\u5740\uff0c\u4ee5\u65b9\u4fbf\u66f4\u591a\u4eba\u770b\u5230\u9879\u76ee\uff0c\u8c22\u8c22\u3002"}</p>
            <p className="about-copyright">© 2026 CodexShell</p>
          </section>
        </div>
      )}
      <div className="sidebar-footer-row">
        <button className="sidebar-account" onClick={() => { setHelpMenuOpen(false); setAccountMenuOpen((value) => !value); }} aria-expanded={accountMenuOpen}>
          <span className="sidebar-avatar">CS</span>
          <span>YourMenu</span>
          <ChevronUp className={accountMenuOpen ? "" : "is-down"} size={14} />
        </button>
        <button className="sidebar-help" title={isEnglish ? "Help" : "帮助"} aria-label={isEnglish ? "Help" : "帮助"} aria-expanded={helpMenuOpen} onClick={() => { setAccountMenuOpen(false); setHelpMenuOpen((value) => !value); }}>
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

function ShellLayout({ title = "CodexShell", appName = "YourApp", language = "zh-CN", showMenuBar = true, closeAction = "tray", left, main, right, bottom, settings }: ShellLayoutProps) {
  const isEnglish = language === "en";
  const initial = useRef<Partial<LayoutState> | null>(null);
  if (initial.current === null) initial.current = loadLayoutState();
  const saved = initial.current;
  const [leftOpen, setLeftOpen] = useState(saved.leftOpen ?? true);
  const [rightOpen, setRightOpen] = useState(saved.rightOpen ?? true);
  const [rightFullscreen, setRightFullscreen] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(saved.bottomOpen ?? true);
  const [bottomFullscreen, setBottomFullscreen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(saved.leftWidth ?? LEFT_DEFAULT);
  const [rightWidth, setRightWidth] = useState(saved.rightWidth ?? RIGHT_DEFAULT);
  const [bottomHeight, setBottomHeight] = useState(saved.bottomHeight ?? BOTTOM_DEFAULT);
  const [isMaximized, setIsMaximized] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragging, setDragging] = useState<DragKind | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const windowHandle = getCurrentWindow();
    let disposed = false;
    const syncMaximizedState = async () => {
      const maximized = await windowHandle.isMaximized();
      if (!disposed) setIsMaximized(maximized);
    };

    void syncMaximizedState();
    let unlisten: (() => void) | undefined;
    void windowHandle.onResized(() => { void syncMaximizedState(); }).then((cleanup) => {
      if (disposed) cleanup();
      else unlisten = cleanup;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

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
        setBottomHeight((value) => Math.min(value, Math.max(MIN_BOTTOM, bounds.height - 44)));
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

  const getRightMaxWidth = useCallback(() => {
    const shellWidth = shellRef.current?.getBoundingClientRect().width ?? 1000;
    const leftSpace = leftOpen ? leftWidth : 0;
    return Math.max(MIN_SIDE, shellWidth - leftSpace - 240);
  }, [leftOpen, leftWidth]);

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
      if (event.key === "ArrowLeft") setRightWidth((value) => clamp(value + step, MIN_SIDE, getRightMaxWidth()));
      else if (event.key === "ArrowRight") setRightWidth((value) => clamp(value - step, MIN_SIDE, getRightMaxWidth()));
      else if (event.key === "Home") setRightOpen(false);
      else if (event.key === "End") { setRightOpen(true); setRightWidth(getRightMaxWidth()); }
      else handled = false;
    } else {
      if (event.key === "ArrowUp") setBottomHeight((value) => clamp(value + step, MIN_BOTTOM, 1200));
      else if (event.key === "ArrowDown") { setBottomFullscreen(false); setBottomHeight((value) => clamp(value - step, MIN_BOTTOM, 1200)); }
      else if (event.key === "Home") { setBottomFullscreen(false); setBottomOpen(false); }
      else if (event.key === "End") { setBottomOpen(true); setBottomFullscreen(true); setBottomHeight(1200); }
      else handled = false;
    }
    if (handled) event.preventDefault();
  }, [getRightMaxWidth]);

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
        else { setRightOpen(true); setRightWidth(clamp(next, MIN_SIDE, getRightMaxWidth())); }
      }
      if (dragging === "bottom") {
        const next = bounds.bottom - event.clientY;
        if (next < MIN_BOTTOM * 0.62) { setDragging(null); setBottomOpen(false); }
        else {
          const maxBottom = Math.max(MIN_BOTTOM, bounds.height - 44);
          setBottomOpen(true);
          const snapped = next >= maxBottom - 64;
          setBottomFullscreen(snapped);
          setBottomHeight(snapped ? maxBottom : clamp(next, MIN_BOTTOM, maxBottom));
        }
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
  }, [dragging, getRightMaxWidth]);

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
          <button className="window-button window-history" type="button" aria-label={isEnglish ? "Back" : "后退"} aria-disabled="true"><ArrowLeft size={15} /></button>
          <button className="window-button window-history" type="button" aria-label={isEnglish ? "Forward" : "前进"} aria-disabled="true"><ArrowRight size={15} /></button>
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
          <WindowButton label={isMaximized ? (isEnglish ? "Restore" : "恢复") : (isEnglish ? "Maximize" : "最大化")} onClick={() => void getCurrentWindow().toggleMaximize()}>{isMaximized ? <Copy size={12} /> : <Square size={12} />}</WindowButton>
          <WindowButton label={isEnglish ? "Close" : "关闭"} danger onClick={() => {
            if (closeAction === "exit") void invoke("exit_app");
            else void getCurrentWindow().hide();
          }}><X size={14} /></WindowButton>
        </div>
      </header>
      <div ref={shellRef} className={`app-shell ${rightFullscreen ? "right-fullscreen" : ""} ${dragging ? `is-dragging drag-${dragging}` : ""}`}>
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
              <IconButton label={isEnglish ? (bottomOpen ? "Hide bottom panel" : "Show bottom panel") : (bottomOpen ? "收起底部面板" : "展开底部面板")} onClick={() => { setBottomFullscreen(false); setBottomOpen((value) => !value); }} className={bottomOpen ? "is-active" : ""}><PanelBottom size={15} /></IconButton>
              <IconButton label={isEnglish ? (rightOpen ? "Hide files panel" : "Show files panel") : (rightOpen ? "收起文件栏" : "展开文件栏")} onClick={() => { setRightFullscreen(false); setRightOpen((value) => !value); }} className={rightOpen ? "is-active" : ""}><PanelRight size={15} /></IconButton>
            </div>
          </div>
          <section className="main-placeholder">{settingsOpen && settings ? settings : main}</section>
          {bottomOpen && <div className="resize-handle horizontal bottom-handle" role="separator" tabIndex={0} aria-orientation="horizontal" aria-label="调整底部面板高度" onPointerDown={(e) => startDrag("bottom", e)} onKeyDown={(e) => resizeWithKeyboard("bottom", e)} />}
          <section className={`bottom-panel ${bottomOpen ? "is-open" : "is-closed"}`} aria-hidden={!bottomOpen} inert={!bottomOpen}>
            <div className="bottom-toolbar"><span>{title}</span>{bottomFullscreen && <IconButton label={isEnglish ? "Restore bottom panel" : "恢复底部面板"} onClick={() => { setBottomFullscreen(false); setBottomHeight(BOTTOM_DEFAULT); }} className="bottom-collapse-button"><PanelBottom size={15} /></IconButton>}</div>
            {bottom}
          </section>
        </main>

        {rightOpen && !rightFullscreen && <div className="resize-handle vertical right-handle" role="separator" tabIndex={0} aria-orientation="vertical" aria-label="调整右侧栏宽度" onPointerDown={(e) => startDrag("right", e)} onKeyDown={(e) => resizeWithKeyboard("right", e)} />}
        <aside className={`panel right-panel ${rightOpen ? "is-open" : "is-closed"} ${rightFullscreen ? "is-fullscreen" : ""}`} aria-hidden={!rightOpen} inert={!rightOpen}>
          <div className="panel-toolbar right-toolbar">
            <span>{isEnglish ? "Files" : "文件"}</span>
            <div className="toolbar-actions">
              <IconButton label={rightFullscreen ? (isEnglish ? "Restore files panel" : "退出文件栏全屏") : (isEnglish ? "Maximize files panel" : "文件栏全屏")} onClick={() => { setRightOpen(true); setRightFullscreen((value) => !value); }} className={rightFullscreen ? "is-active" : ""}>{rightFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</IconButton>
              <IconButton label={isEnglish ? (bottomOpen ? "Hide bottom panel" : "Show bottom panel") : (bottomOpen ? "收起底部面板" : "呼出底部面板")} onClick={() => { setRightFullscreen(false); setBottomFullscreen(false); setBottomOpen((value) => !value); }} className={bottomOpen ? "is-active" : ""}><PanelBottom size={15} /></IconButton>
              <IconButton label={isEnglish ? "Hide files panel" : "收起文件栏"} onClick={() => { setRightFullscreen(false); setRightOpen(false); }}><PanelRight size={15} /></IconButton>
            </div>
          </div>
          {right}
        </aside>
      </div>
    </div>
  );
}

export default ShellLayout;

import { createRoot } from "react-dom/client";
import Oneko from "../oneko";
import { useSettingTheme, useSettingOnekoEnabled } from "../settings";
import { Topbar } from "../topbar";
import Dropdown, { type DropdownItem } from "react-dropdown";

createRoot(document.querySelector("#root")!).render(<Settings />);

const themeOptions: DropdownItem[] = [
    { value: "sparkle", label: "purple sparklies" },
    { value: "sparkle_red", label: "red sparklies" },
    { value: "sparkle_green", label: "green sparklies" },
    { value: "flint", label: "FFLIIIINTT!!!" },
    { value: "boring", label: "boring" },
]

function Settings() {
    const [ onekoEnabled, setOnekoEnabled ] = useSettingOnekoEnabled();
    const [ theme, setTheme ] = useSettingTheme();

    return (
        <div id="app" data-theme={theme}>
            <div className="background"></div>
            <Topbar />
            <Oneko />

            <Checkbox name="Enable oneko" value={onekoEnabled} onToggle={setOnekoEnabled} />
            <div className="option dropdown">
                <span>theme</span>
                <Dropdown options={themeOptions} value={theme} onChange={event => setTheme(event.value as string)} />
            </div>
        </div>
    )
}

function Checkbox({ name, value, onToggle }: { name: string, value: boolean, onToggle: (newValue: boolean) => void }) {
    return (
        <div className="option checkbox" onClick={event => onToggle(!value)}>
            <div className={"value-graphic" + (value ? " toggled" : "")}>
                <div className="slider"></div>
            </div>
            <label>{name}</label>
        </div>
    )
}

// function Dropdown({ name, value, values, onChange }:
//     { name: string, value: boolean, values: Record<string, string>, onChange: (newValue: string) => void }) {
//     return (
//         <div className="option dropdown">
//             <div className={"value-graphic" + (value ? " toggled" : "")}>
//                 <div className="slider"></div>
//             </div>
//             <label>{name}</label>
//         </div>
//     )
// }
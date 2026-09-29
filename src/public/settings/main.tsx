import { createRoot } from "react-dom/client";
import Oneko from "../oneko";
import { useOnekoEnabled } from "../settings";
import { Topbar } from "../topbar";

createRoot(document.querySelector("#root")!).render(<Settings />);

function Settings() {
    const [ onekoEnabled, setOnekoEnabled ] = useOnekoEnabled();

    return (
        <>
            <div className="background"></div>
            <Topbar />
            <Oneko />

            <Checkbox name="Enable oneko" value={onekoEnabled} onToggle={setOnekoEnabled} />
        </>
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
import { useEffect } from "react";

interface OnekoState {
    nekoPosX: number;
    nekoPosY: number;
    mousePosX: number;
    mousePosY: number;
    frameCount: number;
    idleTime: number;
    idleAnimation: string | null;
    idleAnimationFrame: number;
}
function loadState(): OnekoState {
    const state = localStorage["oneko"];

    if(state != null) {
        try {
            return JSON.parse(state);
        } catch(e) {
            console.warn("Failed to read oneko: " + e);
        }
    }

    return {
        nekoPosX: 32,
        nekoPosY: 32,
        mousePosX: 0,
        mousePosY: 0,
        frameCount: 0,
        idleTime: 0,
        idleAnimation: null,
        idleAnimationFrame: 0
    }
}
function saveState(state: OnekoState) {
    localStorage["oneko"] = JSON.stringify(state);
}

const spriteSets: Record<string, [number, number][]> = {
    idle: [[-3, -3]],
    alert: [[-7, -3]],
    scratch: [
        [-5, 0],
        [-6, 0],
        [-7, 0],
    ],
    tired: [[-3, -2]],
    sleeping: [
        [-2, 0],
        [-2, -1],
    ],
    N: [
        [-1, -2],
        [-1, -3],
    ],
    NE: [
        [0, -2],
        [0, -3],
    ],
    E: [
        [-3, 0],
        [-3, -1],
    ],
    SE: [
        [-5, -1],
        [-5, -2],
    ],
    S: [
        [-6, -3],
        [-7, -2],
    ],
    SW: [
        [-5, -3],
        [-6, -1],
    ],
    W: [
        [-4, -2],
        [-4, -3],
    ],
    NW: [
        [-1, 0],
        [-1, -1],
    ],
};

// Courtesy of https://github.com/Asif10H/react-cursor-cat/
export function Oneko() {
    useEffect(() => {
        const nekoEl = document.createElement("div");
        const nekoSpeed = 10;
        const state = loadState();

        const beforeUnloadListener = () => saveState(state);
        window.addEventListener("beforeunload", beforeUnloadListener);

        function setSprite(name: string, frame: number) {
            const sprite = spriteSets[name]![frame % spriteSets[name]!.length]!;
            nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
        }
        function resetIdleAnimation() {
            state.idleAnimation = null;
            state.idleAnimationFrame = 0;
        }
        function idle() {
            state.idleTime += 1;
            if (
                state.idleTime > 10 &&
                Math.floor(Math.random() * 200) === 0 &&
                state.idleAnimation == null
            ) {
                state.idleAnimation = ["sleeping", "scratch"][Math.floor(Math.random() * 2)]!;
            }
            switch (state.idleAnimation) {
                case "sleeping":
                    if (state.idleAnimationFrame < 8) {
                        setSprite("tired", 0);
                        break;
                    }
                    setSprite("sleeping", Math.floor(state.idleAnimationFrame / 4));
                    if (state.idleAnimationFrame > 192) {
                        resetIdleAnimation();
                    }
                    break;
                case "scratch":
                    setSprite("scratch", state.idleAnimationFrame);
                    if (state.idleAnimationFrame > 9) {
                        resetIdleAnimation();
                    }
                    break;
                default:
                    setSprite("idle", 0);
                    return;
            }
            state.idleAnimationFrame += 1;
        }
        function frame() {
            state.frameCount += 1;
            const diffX = state.nekoPosX - state.mousePosX;
            const diffY = state.nekoPosY - state.mousePosY;
            const distance = Math.sqrt(diffX ** 2 + diffY ** 2);
            if (distance < nekoSpeed || distance < 48) {
                idle();
                return;
            }
            state.idleAnimation = null;
            state.idleAnimationFrame = 0;
            if (state.idleTime > 1) {
                setSprite("alert", 0);
                state.idleTime = Math.min(state.idleTime, 7);
                state.idleTime -= 1;
                return;
            }
            let direction = diffY / distance > 0.5 ? "N" : "";
            direction += diffY / distance < -0.5 ? "S" : "";
            direction += diffX / distance > 0.5 ? "W" : "";
            direction += diffX / distance < -0.5 ? "E" : "";
            setSprite(direction, state.frameCount);
            state.nekoPosX -= (diffX / distance) * nekoSpeed;
            state.nekoPosY -= (diffY / distance) * nekoSpeed;
            nekoEl.style.left = `${state.nekoPosX - 16}px`;
            nekoEl.style.top = `${state.nekoPosY - 16}px`;

            saveState(state);
        }
        function create() {
            nekoEl.id = "oneko";
            nekoEl.style.width = "32px";
            nekoEl.style.height = "32px";
            nekoEl.style.position = "fixed";

            nekoEl.style.imageRendering = "pixelated";
            nekoEl.style.left = "16px";
            nekoEl.style.top = "16px";
            nekoEl.style.pointerEvents = "none";
            nekoEl.style.zIndex = "9999";

            frame();
            document.body.appendChild(nekoEl);

            const handleMouseMove = (event: MouseEvent) => {
                state.mousePosX = event.clientX;
                state.mousePosY = event.clientY;
            };
            document.addEventListener("mousemove", handleMouseMove);

            const interval = setInterval(frame, 100);

            return () => {
                clearInterval(interval);
                window.removeEventListener("beforeunload", beforeUnloadListener);
                document.removeEventListener("mousemove", handleMouseMove);
                if (document.body.contains(nekoEl)) {
                    document.body.removeChild(nekoEl);
                }
            };
        }
        const cleanup = create();
        return cleanup;
    }, []);

    return <></>;
};

export default Oneko;
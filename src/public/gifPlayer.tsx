import { useEffect, useMemo, useRef, useState } from "react";
import { GifReader } from "gif-tools";

export function GifPlayer({ url, repeat }: { url: string, repeat?: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [ size, setSize ] = useState({ width: 1, height: 1 });

    useEffect(() => {
        fetch(url).then(req => req.arrayBuffer()).then(response => {
            const fileView = new Uint8Array(response);
            const reader = new GifReader(fileView);

            const info = reader.getInfo();
            const frames = reader.getFrames();
            const loadedFrames = new Array<ImageData>;

            setSize({ width: info.width, height: info.height });

            const dummyCanvas = new OffscreenCanvas(info.width, info.height);
            const dummyCtx = dummyCanvas.getContext("2d")!;

            for(let i = 0; i < frames.length; i++) {
                const frame = frames[i]!;

                const dummyImageData = dummyCtx.getImageData(0, 0, info.width, info.height);
                dummyImageData.data.set(frame.imageData.data);

                loadedFrames.push(dummyImageData);
            }

            let nextTimeout: number = 0;
            let currentFrame: number = 0;

            function updateFrame() {
                if(canvasRef.current == null) return;
                const ctx = canvasRef.current.getContext("2d");

                ctx?.clearRect(0, 0, info.width, info.height);
                ctx?.putImageData(loadedFrames[currentFrame]!, 0, 0);
            }

            function queueNextFrame() {
                const frame = frames[currentFrame]!;
                nextTimeout = setTimeout(() => {
                    currentFrame++;
                    
                    if(currentFrame >= frames.length) {
                        currentFrame = 0;
                        return;
                    }
                    
                    updateFrame();
                    queueNextFrame();
                }, frame.delay) as unknown as number;
            }
            
            queueNextFrame();

            return () => {
                clearTimeout(nextTimeout);
            }
        });
    }, [ url ]);

    return <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
    />;
}
import { useEffect, useRef, useState } from "react";
import z, { ZodAny, ZodType } from "zod";

interface NetworkJsonResourceOptions<Schema> {
    url: string,
    retryInterval?: (attempt: number) => number,
    maxAttempts?: number,
    schema?: Schema,
    seamless?: boolean,
    fetchImmediately?: boolean
}

export function useNetworkJsonResource
<Schema extends ZodType = ZodAny>
({ url, retryInterval, maxAttempts, schema, fetchImmediately, seamless }: NetworkJsonResourceOptions<Schema>): (
    (
        { result: z.infer<Schema>, loaded: true } |
        { result: null, loaded: false }
    ) & {
        failed: boolean,
        reload(): Promise<boolean>
    }
) {
    retryInterval ??= () => 5000;
    maxAttempts ??= 1;
    fetchImmediately ??= true;
    seamless ??= false;
    
    const [ loaded, setLoaded ] = useState<boolean>(false);
    const [ result, setResult ] = useState<any>(null);
    const [ failed, setFailed ] = useState<boolean>(false);
    const attempts = useRef(0);

    async function reload() {
        if(!seamless) {
            setLoaded(false);
            setFailed(false);
        }

        attempts.current = attempts.current + 1;

        const request = await fetch(url);
        const body = await request.json();

        if(body?.error) {
            setLoaded(false);
            setFailed(true);
            return false;
        }

        setLoaded(true);
        setResult(schema ? schema.parse(body) : body);
        return true;
    }

    useEffect(() => {
        if(!fetchImmediately) return;

        (async () => {
            while(true) {
                const success = await reload();

                if(success) {
                    break;
                }

                if(attempts.current >= maxAttempts) {
                    console.error("Failed to fetch " + url + " after " + attempts.current + " attempt(s)");
                    break;
                }

                const nextTimeout = retryInterval(attempts.current);

                console.error("Failed to fetch " + url + ", retrying in " + nextTimeout + "ms");

                await new Promise(res => setTimeout(res, nextTimeout));
            }
        })();
    }, [ ]);

    return { result, loaded, reload, failed } as any;
}
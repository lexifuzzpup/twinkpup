import { useEffect, useMemo, useState } from "react";
import { z, type ZodAny, type ZodType } from "zod";

const updateHandlerMap = new Map<string, Set<(value: any) => void>>;

export function useSetting
<T extends ZodType = ZodAny>
(name: string, defaultValue: z.infer<T>, schema: T):
[ z.infer<T>, (value: z.infer<T>) => void ]
{
    const storageKey = `option.${name}`;

    const parsedDefault = useMemo(() => {
        const item = localStorage.getItem(storageKey);

        if(item != null) {
            try {
                return schema.parse(JSON.parse(item));
            } catch(e) {
                console.warn("Failed to load setting value " + storageKey + ": " + e);
            }
        }
        return defaultValue;
    }, [ name ]);

    const [ value, setValue ] = useState(parsedDefault);

    useEffect(() => {
        if(!updateHandlerMap.has(name)) {
            updateHandlerMap.set(name, new Set);
        }
    }, []);

    useEffect(() => {
        const updateHandlers = updateHandlerMap.get(name)!;
        updateHandlers.add(setValue);

        return () => {
            updateHandlers.delete(setValue);
        };
    }, [ setValue ]);

    function setOptionValue(newValue: z.infer<T>) {
        localStorage.setItem(storageKey, JSON.stringify(newValue));

        for(const handler of updateHandlerMap.get(name)!) {
            handler(newValue);
        }
    }

    return [ value, setOptionValue ];
}


export function useSettingOnekoEnabled() {
    return useSetting("oneko_enabled", true, z.boolean());
}
export function useSettingTheme() {
    return useSetting("theme", "sparkle", z.string());
}
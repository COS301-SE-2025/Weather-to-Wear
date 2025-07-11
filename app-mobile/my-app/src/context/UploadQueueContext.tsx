import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchWithAuth } from "../services/fetchWithAuth";

interface UploadQueueContextProps {
    addToQueue: (formData: FormData) => void;
    queueLength: number;
    isProcessing: boolean;
    progressPercent: number;
    justFinished: boolean;
    resetJustFinished: () => void;

}

const UploadQueueContext = createContext<UploadQueueContextProps | undefined>(undefined);

export const useUploadQueue = () => {
    const context = useContext(UploadQueueContext);
    if (!context) {
        throw new Error("useUploadQueue must be used within UploadQueueProvider");
    }
    return context;
};

export const UploadQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [queue, setQueue] = useState<FormData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [total, setTotal] = useState(0);
    const [processed, setProcessed] = useState(0);
    const [justFinished, setJustFinished] = useState(false);


    const addToQueue = (formData: FormData) => {
        setQueue((prev) => [...prev, formData]);
        setTotal((prev) => prev + 1);
    };



    const progressPercent = total > 0 ? Math.round((processed / total) * 100) : 0;

    useEffect(() => {
        const processNext = async () => {
            if (queue.length === 0 || isProcessing) return;

            setIsProcessing(true);
            const next = queue[0];
            const token = localStorage.getItem("token");

            try {
                await fetchWithAuth("http://localhost:5001/api/closet/upload", {
                    method: "POST",
                    body: next,
                    headers: { Authorization: `Bearer ${token}` },
                });
            } catch (err) {
                console.error("Upload failed", err);
                // Optional: Retry or error handling
            } finally {
                setProcessed((prev) => prev + 1);
                setQueue((prev) => prev.slice(1));
                setIsProcessing(false);
            }
        };

        processNext();
    }, [queue, isProcessing]);

    useEffect(() => {
        if (queue.length === 0 && !isProcessing && total > 0) {
            // optional: add short delay
            setTimeout(() => {
                setJustFinished(true);
                setProcessed(0);
                setTotal(0);
            }, 500);
        }
    }, [queue.length, isProcessing, total]);

    useEffect(() => {
        if (queue.length === 0 && !isProcessing && total > 0) {
            setTimeout(() => {
                setJustFinished(true);
                setProcessed(0);
                setTotal(0);
            }, 500);
        }
    }, [queue.length, isProcessing, total]);



    return (
        <UploadQueueContext.Provider
            value={{ addToQueue, queueLength: queue.length, isProcessing, progressPercent, justFinished, resetJustFinished: () => setJustFinished(false) }}
        >
            {children}
        </UploadQueueContext.Provider>
    );
};

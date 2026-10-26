
//const API_URL = "http://localhost:8080/api/medical-records";
import { API_URL } from "../config"
// Status values expected by the Spring Boot backend
export type RecordStatus = "ACTIVE" | "FOLLOW_UP" | "CLOSED";

// Medical Record response received from the backend
export interface MedicalRecord {
    id: number;
    patientId: number;
    patientName: string;
    doctorId: number;
    doctorName: string;
    visitDate: string;
    diagnosis: string;
    prescription: string;
    notes: string;
    status: RecordStatus;
}

// Data required when creating or updating a record
export type MedicalRecordPayload = Omit<
    MedicalRecord,
    "id" | "patientName" | "doctorName"
>;

// Handle API responses and errors
async function handleResponse<T>(
    response: Response
): Promise<T> {
    if (!response.ok) {
        const message = await response.text();
        throw new Error(
            message || `Request failed with status ${response.status}`
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

// 1. Get all medical records
export async function getMedicalRecords(): Promise<MedicalRecord[]> {
    const response = await fetch(API_URL);
    return handleResponse<MedicalRecord[]>(response);
}

// 2. Get one medical record by ID
export async function getMedicalRecordById(
    id: number
): Promise<MedicalRecord> {
    const response = await fetch(`${API_URL}/${id}`,{credentials:"include"});
return handleResponse<MedicalRecord>(response);
}

// 3. Create a medical record
export async function createMedicalRecord(
    record: MedicalRecordPayload
): Promise<MedicalRecord> {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(record),
    });

    return handleResponse<MedicalRecord>(response);
}

// 4. Update a medical record
export async function updateMedicalRecord(
    id: number,
    record: MedicalRecordPayload
): Promise<MedicalRecord> {
    const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(record),
    });

    return handleResponse<MedicalRecord>(response);
}

// 5. Delete a medical record
export async function deleteMedicalRecord(
    id: number
): Promise<void> {
    const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
    });

    await handleResponse<void>(response);
}

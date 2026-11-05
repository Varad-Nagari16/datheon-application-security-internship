import { maskEmail, maskPhone } from "./masking.js";

export type VerificationStatus = "verified" | "pending";

interface PrivateCredentialRecord {
  readonly referenceId: string;
  readonly credentialType: string;
  readonly status: VerificationStatus;
  readonly issuedYear: number;
  readonly contact: {
    readonly email: string;
    readonly phone: string;
  };
}

const credentials: ReadonlyMap<string, PrivateCredentialRecord> = new Map([
  ["CERT-1042", {
    referenceId: "CERT-1042",
    credentialType: "Diploma in Network Security",
    status: "verified",
    issuedYear: 2024,
    contact: { email: "alexandra.morgan@example.test", phone: "+1 (202) 555-0142" },
  }],
  ["CERT-1058", {
    referenceId: "CERT-1058",
    credentialType: "Certificate in Cloud Operations",
    status: "verified",
    issuedYear: 2025,
    contact: { email: "riya.patel@example.test", phone: "+1 (202) 555-0188" },
  }],
  ["CERT-1086", {
    referenceId: "CERT-1086",
    credentialType: "Diploma in Application Development",
    status: "pending",
    issuedYear: 2026,
    contact: { email: "marcus.lee@example.test", phone: "+1 (202) 555-0116" },
  }],
]);

export interface MaskedContact {
  email: string;
  phone: string;
}

export interface PublicLookupResponse {
  referenceId: string;
  credentialType: string;
  status: VerificationStatus;
  issuedYear: number;
  contact: MaskedContact;
}

export interface PublicVerificationResponse {
  referenceId: string;
  valid: boolean;
  status: VerificationStatus;
  contact: MaskedContact;
}

export function findCredential(referenceId: string): PrivateCredentialRecord | undefined {
  return credentials.get(referenceId);
}

function maskedContact(record: PrivateCredentialRecord): MaskedContact {
  return {
    email: maskEmail(record.contact.email),
    phone: maskPhone(record.contact.phone),
  };
}

export function toPublicLookupResponse(record: PrivateCredentialRecord): PublicLookupResponse {
  return {
    referenceId: record.referenceId,
    credentialType: record.credentialType,
    status: record.status,
    issuedYear: record.issuedYear,
    contact: maskedContact(record),
  };
}

export function toPublicVerificationResponse(record: PrivateCredentialRecord): PublicVerificationResponse {
  return {
    referenceId: record.referenceId,
    valid: record.status === "verified",
    status: record.status,
    contact: maskedContact(record),
  };
}

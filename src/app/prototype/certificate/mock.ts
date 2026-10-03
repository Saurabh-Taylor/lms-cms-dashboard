// PROTOTYPE — throwaway mock data for the cert-page variants (#102).
// Serial shape follows the map decision: HMAC-signed credential id
// (payload.signature — verifiable without a DB hit, unenumerable).

export type MockCert = {
  learnerName: string;
  courseTitle: string;
  instructorName: string;
  issuedAt: string;
  serial: string; // display form: CERT-…-.<sig fragment>
  verifyUrl: string;
  durationHours: number;
};

export const MOCK_CERT: MockCert = {
  learnerName: "Saurabh Tailor",
  courseTitle: "Modern React with Server Components",
  instructorName: "Jane Doe",
  issuedAt: "2026-02-14",
  serial: "MSL-2026-K8F3-9AQ2-X7D1.v4a9f2c",
  verifyUrl: "https://microshala.dev/verify/MSL-2026-K8F3-9AQ2-X7D1.v4a9f2c",
  durationHours: 14,
};

export const SHARE_TEXT = `I just completed "${MOCK_CERT.courseTitle}" on Microshala`;
export const SHARE_URL = MOCK_CERT.verifyUrl;

export const LINKEDIN_SHARE = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`;
export const LINKEDIN_ADD_TO_PROFILE =
  `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME` +
  `&name=${encodeURIComponent(MOCK_CERT.courseTitle)}` +
  `&organizationName=${encodeURIComponent("Microshala")}` +
  `&issueYear=2026&issueMonth=2` +
  `&certUrl=${encodeURIComponent(SHARE_URL)}` +
  `&certId=${encodeURIComponent(MOCK_CERT.serial)}`;
export const X_SHARE = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`;

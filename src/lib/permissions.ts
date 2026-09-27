// Permanent re-export shim — the vocabulary lives in @learnhub/contracts
// (backend-owned, file: dep; #7). Gates keep importing "@/lib/permissions".
export { PERM, type Perm } from "@learnhub/contracts";

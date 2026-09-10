// ============================================================
// KNOWLEDGE CANVAS — BUNDLED SAMPLE DATASETS
// ============================================================
// Small deterministic CDR + transaction samples used by the
// Knowledge Canvas demo and its tests. Numbers deliberately overlap
// the seeded NET-001 network (ent-phone-001..007, ent-account-001..004)
// so expansion matches existing nodes and creates new ones.
// ============================================================

export const SAMPLE_CDR_FILE_NAME = 'operation_clean_cdr_sample.csv';

export const SAMPLE_CDR_CSV = `caller,called_number,start_time,duration_seconds,call_type,direction
+91 98765 43210,90210 11345,2026-02-01T08:12:00Z,342,VOICE,OUTGOING
90210 11345,+91 98111 22334,2026-02-01T08:20:00Z,171,VOICE,INCOMING
+91 98765 43210,+91 98111 22334,2026-02-02T10:05:00Z,0,SMS,OUTGOING
88990 12021,+91 98765 43210,2026-02-03T14:30:00Z,411,VOICE,INCOMING
+91 98765 43210,77600 55661,2026-02-04T09:47:00Z,96,VOICE,OUTGOING
99881 44773,+91 98765 43210,2026-02-05T22:04:00Z,263,VOICE,INCOMING
+91 98765 43210,76700 11223,2026-02-06T11:18:00Z,128,VOICE,OUTGOING
76700 11223,90210 11345,2026-02-06T11:40:00Z,52,VOICE,OUTGOING
77600 55661,91234 09987,2026-02-07T19:33:00Z,0,SMS,OUTGOING
+91 98765 43210,96990 50001,2026-02-08T07:59:00Z,307,VOICE,OUTGOING
96990 50001,99881 44773,2026-02-08T08:22:00Z,74,VOICE,OUTGOING
invalid-row-without-numbers,,,,,
`;

export const SAMPLE_TRANSACTION_FILE_NAME = 'operation_clean_transactions_sample.csv';

export const SAMPLE_TRANSACTION_CSV = `from_account,to_account,amount,currency,reference,transaction_time
7731 0029 4567,5522 8890 1123,125000,INR,TXN-2026-02911,2026-02-14T12:05:00Z
7731 0029 4567,9988 2211 4400,48000,INR,TXN-2026-02912,2026-02-15T09:30:00Z
8845 1190 0221,7731 0029 4567,25000,INR,TXN-2026-02913,2026-02-15T16:12:00Z
9012 3445 7760,9988 2211 4400,102500,INR,TXN-2026-02914,2026-02-16T08:02:00Z
5522 8890 1123,9012 3445 7760,37500,INR,TXN-2026-02915,2026-02-17T13:44:00Z
not-masked,,,,
`;
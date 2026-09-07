import type { DataPreview, DataMapping } from '@trinetra-pulse/types';

export const mockPreviews: Record<string, DataPreview> = {
  'ds-001': {
    datasetId: 'ds-001',
    columns: [
      { name: 'fir_number', type: 'string', example: 'FIR-2026-PN-04832', nullPercentage: 0, uniquePercentage: 100 },
      { name: 'complainant_name', type: 'string', example: 'Rajesh Kumar Patil', nullPercentage: 2.1, uniquePercentage: 98.4 },
      { name: 'accused_name', type: 'string', example: 'Suresh Babu Yadav', nullPercentage: 12.3, uniquePercentage: 87.2 },
      { name: 'phone_number', type: 'string', example: '+91 98765 43210', nullPercentage: 8.7, uniquePercentage: 91.5 },
      { name: 'incident_date', type: 'date', example: '2026-03-15', nullPercentage: 0.5, uniquePercentage: 78.3 },
      { name: 'location', type: 'string', example: 'Hinjewadi, Pune', nullPercentage: 1.2, uniquePercentage: 45.6 },
      { name: 'ipc_section', type: 'string', example: 'Section 420', nullPercentage: 0, uniquePercentage: 12.8 },
      { name: 'status', type: 'string', example: 'Under Investigation', nullPercentage: 0, uniquePercentage: 3.2 },
    ],
    rows: [
      { fir_number: 'FIR-2026-PN-04832', complainant_name: 'Rajesh Kumar Patil', accused_name: 'Suresh Babu Yadav', phone_number: '+91 98765 43210', incident_date: '2026-03-15', location: 'Hinjewadi, Pune', ipc_section: 'Section 420', status: 'Under Investigation' },
      { fir_number: 'FIR-2026-PN-04833', complainant_name: 'Priya Mehta', accused_name: 'Unknown', phone_number: '+91 87654 32109', incident_date: '2026-03-16', location: 'Shivajinagar, Pune', ipc_section: 'Section 302', status: 'Closed' },
      { fir_number: 'FIR-2026-PN-04834', complainant_name: 'Amit Deshmukh', accused_name: 'Vikram Sharma', phone_number: '+91 76543 21098', incident_date: '2026-03-17', location: 'Kothrud, Pune', ipc_section: 'Section 376', status: 'Under Investigation' },
      { fir_number: 'FIR-2026-PN-04835', complainant_name: 'Sunita Devi', accused_name: 'Ramesh Gupta', phone_number: '+91 65432 10987', incident_date: '2026-03-18', location: 'Kharadi, Pune', ipc_section: 'Section 498A', status: 'Charge Sheet Filed' },
      { fir_number: 'FIR-2026-PN-04836', complainant_name: 'Vijay Singh', accused_name: 'Ajay Kumar', phone_number: '', incident_date: '2026-03-19', location: 'Wanawadi, Pune', ipc_section: 'Section 420', status: 'Under Investigation' },
    ],
    totalRows: 4832,
    sampleSize: 5,
  },
  'ds-002': {
    datasetId: 'ds-002',
    columns: [
      { name: 'caller_number', type: 'string', example: '+91 98765 43210', nullPercentage: 0, uniquePercentage: 34.2 },
      { name: 'receiver_number', type: 'string', example: '+91 87654 32109', nullPercentage: 0, uniquePercentage: 28.7 },
      { name: 'call_timestamp', type: 'date', example: '2026-08-15T14:23:00Z', nullPercentage: 0, uniquePercentage: 99.1 },
      { name: 'call_duration', type: 'number', example: '245', nullPercentage: 0.3, uniquePercentage: 67.8 },
      { name: 'call_type', type: 'string', example: 'outgoing', nullPercentage: 0, uniquePercentage: 2.1 },
      { name: 'tower_id', type: 'string', example: 'CT-MH-0234', nullPercentage: 1.2, uniquePercentage: 15.3 },
      { name: 'imei', type: 'string', example: '356938035643809', nullPercentage: 3.4, uniquePercentage: 41.2 },
    ],
    rows: [
      { caller_number: '+91 98765 43210', receiver_number: '+91 87654 32109', call_timestamp: '2026-08-15T14:23:00Z', call_duration: 245, call_type: 'outgoing', tower_id: 'CT-MH-0234', imei: '356938035643809' },
      { caller_number: '+91 98765 43210', receiver_number: '+91 76543 21098', call_timestamp: '2026-08-15T14:45:00Z', call_duration: 112, call_type: 'outgoing', tower_id: 'CT-MH-0234', imei: '356938035643809' },
      { caller_number: '+91 54321 09876', receiver_number: '+91 98765 43210', call_timestamp: '2026-08-15T15:01:00Z', call_duration: 89, call_type: 'incoming', tower_id: 'CT-MH-0567', imei: '861234567890123' },
      { caller_number: '+91 98765 43210', receiver_number: '+91 43210 98765', call_timestamp: '2026-08-15T16:30:00Z', call_duration: 67, call_type: 'outgoing', tower_id: 'CT-MH-0234', imei: '356938035643809' },
      { caller_number: '+91 32109 87654', receiver_number: '+91 98765 43210', call_timestamp: '2026-08-15T17:15:00Z', call_duration: 1523, call_type: 'incoming', tower_id: 'CT-MH-0890', imei: '998877665544332' },
    ],
    totalRows: 18742,
    sampleSize: 5,
  },
};

export const mockMappings: Record<string, DataMapping> = {
  'ds-001': {
    datasetId: 'ds-001',
    mappings: [
      { id: 'mp-001', sourceColumn: 'complainant_name', targetField: 'person.name', targetType: 'person', confidence: 0.95, isAutoMapped: true },
      { id: 'mp-002', sourceColumn: 'accused_name', targetField: 'person.name', targetType: 'person', confidence: 0.92, isAutoMapped: true },
      { id: 'mp-003', sourceColumn: 'phone_number', targetField: 'phone.number', targetType: 'phone', confidence: 0.98, isAutoMapped: true },
      { id: 'mp-004', sourceColumn: 'incident_date', targetField: 'event.timestamp', targetType: 'event', confidence: 0.97, isAutoMapped: true },
      { id: 'mp-005', sourceColumn: 'location', targetField: 'location.name', targetType: 'location', confidence: 0.85, isAutoMapped: true },
      { id: 'mp-006', sourceColumn: 'fir_number', targetField: 'document.identifier', targetType: 'document', confidence: 0.99, isAutoMapped: true },
    ],
    createdAt: '2026-08-20T09:20:00Z',
    updatedAt: '2026-08-20T09:22:00Z',
  },
  'ds-002': {
    datasetId: 'ds-002',
    mappings: [
      { id: 'mp-010', sourceColumn: 'caller_number', targetField: 'phone.number', targetType: 'phone', confidence: 0.99, isAutoMapped: true },
      { id: 'mp-011', sourceColumn: 'receiver_number', targetField: 'phone.number', targetType: 'phone', confidence: 0.99, isAutoMapped: true },
      { id: 'mp-012', sourceColumn: 'call_timestamp', targetField: 'event.timestamp', targetType: 'event', confidence: 0.98, isAutoMapped: true },
      { id: 'mp-013', sourceColumn: 'tower_id', targetField: 'location.identifier', targetType: 'location', confidence: 0.88, isAutoMapped: true },
      { id: 'mp-014', sourceColumn: 'imei', targetField: 'phone.imei', targetType: 'phone', confidence: 0.95, isAutoMapped: true },
    ],
    createdAt: '2026-08-22T11:05:00Z',
    updatedAt: '2026-08-22T11:08:00Z',
  },
};

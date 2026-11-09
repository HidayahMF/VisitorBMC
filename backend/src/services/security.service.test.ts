import { describe, expect, it } from 'vitest';
import { groupTravelReportDate, mapGroupTravelReportRows, mapGroupTravelRows, mapTravel } from './security.service';

describe('security travel flow', () => {
  it('memetakan tugas luar mandiri tanpa mengubah format existing', () => {
    expect(mapTravel({ Id: 7, NIP: '1000', Nama: 'Mandiri', Tujuan: 'Pabrik', Keperluan: 'Audit', StartDate: '2026-11-09', StartTime: '08:00:00', CheckpointId: 0 })).toMatchObject({
      id: 7,
      nip: '1000',
      nama: 'Mandiri',
      tujuan: 'Pabrik',
      keperluan: 'Audit',
      status: 'AKAN_TUGAS_LUAR',
      jenisTugas: 'MANDIRI',
    });
  });

  it('hanya mengizinkan keberangkatan group setelah approval kendaraan', () => {
    const [waiting, approved] = mapGroupTravelRows([
      { GroupCode: 'WAIT-01', VersionNo: 1, ExitDate: '2026-11-09', ExitTime: '08:00', Tujuan: 'Gudang', Tugas: 'Kirim', MemberNIP: '1001', MemberName: 'Andi', MemberStatus: 'ACTIVE', VehicleApprovalStatus: 2 },
      { GroupCode: 'OK-01', VersionNo: 1, ExitDate: '2026-11-09', ExitTime: '08:00', Tujuan: 'Gudang', Tugas: 'Kirim', MemberNIP: '1001', MemberName: 'Andi', MemberStatus: 'ACTIVE', VehicleApprovalStatus: 3 },
    ]);

    expect(waiting.canDepart).toBe(false);
    expect(approved.canDepart).toBe(true);
  });

  it('tidak memetakan group yang sudah kembali', () => {
    expect(mapGroupTravelRows([
      { GroupCode: 'DONE-01', VersionNo: 1, ExitDate: '2026-11-09', ExitTime: '08:00', DepartureAt: '2026-11-09T08:10:00', ReturnedDate: '2026-11-09', MemberNIP: '1001', MemberName: 'Andi', MemberStatus: 'ACTIVE' },
    ])).toEqual([]);
  });

  it('memakai tanggal kepulangan checkpoint untuk filter laporan group', () => {
    expect(groupTravelReportDate({ ExitDate: '2026-11-08', ReturnedDate: '2026-11-09' })).toBe('2026-11-09');
  });

  it('memetakan group yang sudah kembali sebagai satu row laporan', () => {
    const rows = mapGroupTravelReportRows([
      { GroupCode: 'DONE-01', VersionNo: 2, ExitDate: '2026-11-09', ExitTime: '08:00', Tujuan: 'Gudang', Tugas: 'Kirim', DepartureAt: '2026-11-09T08:10:00', GroupCheckpointDepartureTime: '08:10', ReturnedDate: '2026-11-09', ReturnedTime: '16:30', MemberNIP: '1001', MemberName: 'Andi', MemberStatus: 'ACTIVE' },
      { GroupCode: 'DONE-01', VersionNo: 2, ExitDate: '2026-11-09', ExitTime: '08:00', Tujuan: 'Gudang', Tugas: 'Kirim', ReturnedDate: '2026-11-09', ReturnedTime: '16:30', MemberNIP: '1002', MemberName: 'Budi', MemberStatus: 'ACTIVE' },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'DONE-01',
      groupCode: 'DONE-01',
      nip: '1001, 1002',
      nama: 'Andi, Budi',
      tanggal: '2026-11-09',
      jamKeluar: '08:00',
      departureTime: '08:10',
      jamKembali: '16:30',
      tujuan: 'Gudang',
      keperluan: 'Kirim',
      jenisTugas: 'GROUP',
    });
  });

  it('memetakan group dari versi terbaru dan hanya member aktif tanpa duplikasi', () => {
    const rows = mapGroupTravelRows([
      { GroupCode: 'GRP-01', VersionNo: 1, ExitDate: '2026-11-09', ExitTime: '08:00', Tujuan: 'Gudang A', Tugas: 'Versi lama', VehicleType: 'CAR', VehiclePlate: 'B 1', GroupStatus: 'APPROVED', VersionStatus: 'APPROVED', MemberNIP: '1001', MemberName: 'Lama', MemberStatus: 'ACTIVE' },
      { GroupCode: 'GRP-01', VersionNo: 2, ExitDate: '2026-11-09', ExitTime: '09:00', Tujuan: 'Gudang B', Tugas: 'Versi terbaru', VehicleType: 'VAN', VehiclePlate: 'B 2', GroupStatus: 'APPROVED', VersionStatus: 'APPROVED', MemberNIP: '1001', MemberName: 'Andi', MemberStatus: 'ACTIVE' },
      { GroupCode: 'GRP-01', VersionNo: 2, ExitDate: '2026-11-09', ExitTime: '09:00', Tujuan: 'Gudang B', Tugas: 'Versi terbaru', VehicleType: 'VAN', VehiclePlate: 'B 2', GroupStatus: 'APPROVED', VersionStatus: 'APPROVED', MemberNIP: '1002', MemberName: 'Budi', MemberStatus: 'ACTIVE' },
      { GroupCode: 'GRP-01', VersionNo: 2, ExitDate: '2026-11-09', ExitTime: '09:00', Tujuan: 'Gudang B', Tugas: 'Versi terbaru', VehicleType: 'VAN', VehiclePlate: 'B 2', GroupStatus: 'APPROVED', VersionStatus: 'APPROVED', MemberNIP: '1003', MemberName: 'Tidak Aktif', MemberStatus: 'REMOVED' },
      { GroupCode: 'GRP-01', VersionNo: 2, ExitDate: '2026-11-09', ExitTime: '09:00', Tujuan: 'Gudang B', Tugas: 'Versi terbaru', VehicleType: 'VAN', VehiclePlate: 'B 2', GroupStatus: 'APPROVED', VersionStatus: 'APPROVED', MemberNIP: '1002', MemberName: 'Budi', MemberStatus: 'ACTIVE' },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ groupCode: 'GRP-01', tujuan: 'Gudang B', keperluan: 'Versi terbaru', kendaraan: 'VAN', platNomor: 'B 2' });
    expect(rows[0].members).toEqual([{ nip: '1001', nama: 'Andi' }, { nip: '1002', nama: 'Budi' }]);
  });
});

import json
import os
import re
import time
import difflib
from collections import defaultdict
from datetime import datetime

class Warna:
    HITAM = '\033[30m'
    MERAH = '\033[91m'
    HIJAU = '\033[92m'
    KUNING = '\033[93m'
    BIRU = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    PUTIH = '\033[97m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    NORMAL = '\033[0m'

# Fungsi utilitas
def muat_kamus(file_path='data-max.json'):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data['kamus']['id-dayak'], data['kamus']['dayak-id']

def bersih():
    os.system('cls' if os.name == 'nt' else 'clear')

def animasi_tampil(teks, delay=0.01):
    """Fungsi untuk menampilkan teks dengan efek animasi mengetik."""
    for char in teks:
        print(char, end='', flush=True)
        time.sleep(delay)
    print()  # Akhiri dengan newline

def header():
    teks = f"{Warna.CYAN}{Warna.BOLD}╔═══════════════════════════════════════════════════╗\n"
    teks += f"║ {Warna.MAGENTA} Kamus Dayak Kanayatn ↔ Indonesia {Warna.NORMAL}{Warna.CYAN}       ║\n"
    teks += f"╚═══════════════════════════════════════════════════╝{Warna.NORMAL}\n"
    teks += f"{Warna.HIJAU}Tulis 'help' untuk bantuan, 'exit' untuk keluar.{Warna.NORMAL}\n"
    teks += f"{Warna.BIRU}Aplikasi ini menggunakan kamus Bahasa Dayak ↔ Indonesia.{Warna.NORMAL}\n"
    animasi_tampil(teks)

def tampil_bantuan():
    teks = f"{Warna.HIJAU}{Warna.BOLD}Perintah Tersedia:{Warna.NORMAL}\n"
    perintah = {
        "help": "Tampilkan bantuan",
        "about": "Info tentang aplikasi",
        "histori": "Lihat histori pencarian",
        "exit": "Keluar dari kamus"
    }
    for cmd, desc in perintah.items():
        teks += f"  {Warna.CYAN}{cmd}{Warna.NORMAL}     → {desc}\n"
    teks += f"\n{Warna.MAGENTA}Info: 085328736706\nBy: Nelsen Niko{Warna.NORMAL}\n"
    animasi_tampil(teks)

def tampil_about():
    teks = f"""{Warna.BOLD}{Warna.MAGENTA}
Tentang Aplikasi Kamus Dayak ↔ Indonesia:
{Warna.NORMAL}
Aplikasi ini adalah kamus digital yang membantu menerjemahkan
kata dari Bahasa Indonesia ke Bahasa Dayak Kanayatn dan sebaliknya.

Fitur:
- Penerjemahan dua arah (ID ↔ Dayak)
- Riwayat pencarian
- Saran kata mirip jika tidak ditemukan
- Warna terminal yang ramah pengguna

Dibuat dengan Python 3.12.10 untuk keperluan edukasi dan pelestarian bahasa lokal.
"""
    animasi_tampil(teks)

def tampil_histori():
    if not history:
        animasi_tampil(f"{Warna.KUNING}Belum ada histori.{Warna.NORMAL}")
    else:
        teks = f"{Warna.MAGENTA}{Warna.BOLD}Histori Pencarian Terakhir:{Warna.NORMAL}\n"
        for i, (kata, waktu) in enumerate(history[-10:], 1):
            teks += f"  {Warna.HIJAU}{i}. {kata} pada {waktu}{Warna.NORMAL}\n"
        animasi_tampil(teks)

def deteksi_asal(kata):
    if kata in id_dayak:
        return "Bahasa Indonesia"
    elif kata in dayak_id:
        return "Bahasa Dayak"
    return None

def simpan_cache_histori(kata, hasil):
    cache[kata] = hasil
    history.append((kata, datetime.now().strftime("%d-%m-%Y %H:%M:%S")))
    if len(history) > 100:
        history.pop(0)

def cari_kata_terdekat(kata):
    kandidat = list(semua_kamus.keys())
    return difflib.get_close_matches(kata, kandidat, n=3, cutoff=0.7)

def logika_cari(kata):
    kata = kata.lower().strip()
    if not kata:
        return f"{Warna.KUNING}Masukkan tidak boleh kosong.{Warna.NORMAL}"

    if kata in cache and cache[kata]:
        return cache[kata]

    asal = deteksi_asal(kata)
    if asal:
        arti = id_dayak.get(kata) if asal == "Bahasa Indonesia" else dayak_id.get(kata)
        hasil = f"{Warna.HIJAU}[{asal}] {kata} → {arti}{Warna.NORMAL}"
    else:
        saran_langsung = [f"{Warna.BIRU}{k} → {v}{Warna.NORMAL}"
                          for k, v in semua_kamus.items()
                          if kata in k or kata in v][:5]

        koreksi = cari_kata_terdekat(kata)
        if koreksi:
            hasil = f"{Warna.KUNING}Kata tidak ditemukan. Mungkin maksudmu:\n" + \
                    "\n".join(f"- {k}" for k in koreksi)
        elif saran_langsung:
            hasil = f"{Warna.KUNING}Kata tidak ditemukan. Mungkin yang dimaksud:\n" + \
                    "\n".join(saran_langsung)
        else:
            hasil = f"{Warna.MERAH}Tidak ditemukan dalam kamus.{Warna.NORMAL}"

    simpan_cache_histori(kata, hasil)
    return hasil

def animasi_keluar():
    print()
    for _ in range(3):
        print(f"{Warna.HIJAU}Mengakhiri program", end='', flush=True)
        for __ in range(3):
            print(".", end='', flush=True)
            time.sleep(0.4)
        print("\r", end='', flush=True)
    time.sleep(0.4)
    animasi_tampil(f"{Warna.HIJAU}Sampai jumpa. Semoga harimu menyenangkan!{Warna.NORMAL}")

def main():
    bersih()
    header()
    while True:
        kata = input(f"{Warna.CYAN}>> {Warna.NORMAL}").strip().lower()
        if not kata:
            animasi_tampil(f"{Warna.KUNING}Input tidak boleh kosong.{Warna.NORMAL}")
            continue
        if kata in ('exit', 'keluar'):
            animasi_keluar()
            break
        elif kata == 'help':
            tampil_bantuan()
        elif kata == 'about':
            tampil_about()
        elif kata == 'histori':
            tampil_histori()
        else:
            animasi_tampil(logika_cari(kata))
            print()

# Load kamus hanya sekali di awal
id_dayak, dayak_id = muat_kamus()
semua_kamus = {**id_dayak, **dayak_id}
cache = defaultdict(lambda: None)
history = []

if __name__ == "__main__":
    main()
  

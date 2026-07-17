import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons';
import styles from './SearchBox.module.scss';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Live search box dipakai di atas tabel data (Penjual, Pelanggan, Produk, Kategori
// Produk, Kategori Pengeluaran) — pemanggil bertanggung jawab men-debounce nilainya
// sebelum dipakai buat query (lihat pola requestIdRef di halaman-halaman itu).
export default function SearchBox({ value, onChange, placeholder = 'Cari...' }: SearchBoxProps) {
  return (
    <div className={styles.searchBox}>
      <FontAwesomeIcon icon={faMagnifyingGlass} className={styles.searchIcon} />
      <input
        type="text"
        className={styles.searchInput}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className={styles.searchClear}
          onClick={() => onChange('')}
          aria-label="Hapus pencarian"
          title="Hapus pencarian"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      )}
    </div>
  );
}

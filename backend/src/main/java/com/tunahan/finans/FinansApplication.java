package com.tunahan.finans;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.Locale;

@SpringBootApplication
public class FinansApplication {

	public static void main(String[] args) {
		// Türkçe locale'de Oracle JDBC "insert"i "İNSERT" diye büyütüp identity değerini döndüremiyor (ORA-17023).
		// Backend arayüz metni biçimlendirmiyor; tr-TR biçimleri frontend'de.
		Locale.setDefault(Locale.ROOT);
		SpringApplication.run(FinansApplication.class, args);
	}

}

package com.tunahan.finans.pricing;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.Locale;

/** Arama eşleştirmesi: büyük/küçük harf ve Türkçe karakter duyarsız ("ATA PORTFÖY" ↔ "ata portfoy"). */
final class SearchText {

    private static final Locale TR = Locale.forLanguageTag("tr");

    private SearchText() {
    }

    static String normalize(String text) {
        String lower = text.strip().toLowerCase(TR).replace('ı', 'i');
        return Normalizer.normalize(lower, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }

    /** Sorgunun her kelimesi metindeki bir kelimenin başıyla eşleşiyorsa true ("hava türk" ↔ "Türk Hava Yolları"). */
    static boolean matches(String text, String query) {
        String[] words = normalize(text).split("[^\\p{L}\\p{N}]+");
        return Arrays.stream(normalize(query).split("\\s+"))
                .allMatch(q -> Arrays.stream(words).anyMatch(w -> w.startsWith(q)));
    }
}

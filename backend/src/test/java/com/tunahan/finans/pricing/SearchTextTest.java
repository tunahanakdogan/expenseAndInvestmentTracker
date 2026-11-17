package com.tunahan.finans.pricing;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SearchTextTest {

    @Test
    void ignoresCaseAndTurkishCharacters() {
        assertThat(SearchText.normalize("ATA PORTFÖY")).isEqualTo(SearchText.normalize("ata portfoy"));
        assertThat(SearchText.normalize("İŞ PORTFÖY")).isEqualTo("is portfoy");
        assertThat(SearchText.normalize("Türk Hava Yolları")).isEqualTo("turk hava yollari");
        assertThat(SearchText.normalize("  ÇİMSA  ")).isEqualTo("cimsa");
    }

    @Test
    void matchesWhenEveryWordAppears() {
        assertThat(SearchText.matches("Türk Hava Yolları Anonim", "hava türk")).isTrue();
        assertThat(SearchText.matches("Türk Hava Yolları Anonim", "pegasus")).isFalse();
    }
}

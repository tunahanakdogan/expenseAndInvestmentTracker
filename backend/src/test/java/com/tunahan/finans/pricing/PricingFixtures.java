package com.tunahan.finans.pricing;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/** src/test/resources/pricing/ altındaki örnek yanıt dosyalarını okur. */
final class PricingFixtures {

    private PricingFixtures() {
    }

    static String read(String name) {
        try {
            return Files.readString(Path.of("src/test/resources/pricing", name), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}

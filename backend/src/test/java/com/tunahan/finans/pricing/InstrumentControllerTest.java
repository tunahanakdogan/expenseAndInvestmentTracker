package com.tunahan.finans.pricing;

import com.tunahan.finans.IntegrationTest;
import com.tunahan.finans.TestAuth;
import com.tunahan.finans.common.AssetType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@IntegrationTest
class InstrumentControllerTest {

    @Autowired
    MockMvcTester mvc;
    @MockitoBean
    YahooSymbolSearch yahoo;
    @MockitoBean
    TefasFundCatalog funds;

    @Test
    void returnsMatchingInstruments() {
        when(yahoo.search(anyString())).thenReturn(List.of(
                new Instrument(AssetType.BIST_STOCK, "THYAO", "Türk Hava Yolları", "IST")));
        when(funds.search(anyString())).thenReturn(List.of());

        assertThat(mvc.get().uri("/api/pricing/instruments?q={q}", "türk hava").header("Authorization", TestAuth.bearer(mvc)))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        [{"type": "BIST_STOCK", "symbol": "THYAO", "name": "Türk Hava Yolları", "exchange": "IST"}]
                        """);
    }

    @Test
    void requiresToken() {
        assertThat(mvc.get().uri("/api/pricing/instruments?q=thy")).hasStatus(HttpStatus.UNAUTHORIZED);
    }
}

package com.tunahan.finans.pricing;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.ErrorHandler;
import org.xml.sax.SAXParseException;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;

/** TCMB günlük kurları; değer olarak {@code ForexSelling} kullanılır. */
@Component
class TcmbExchangeRateProvider implements ExchangeRateProvider {

    private static final Logger log = LoggerFactory.getLogger(TcmbExchangeRateProvider.class);
    private static final String URL = "https://www.tcmb.gov.tr/kurlar/today.xml";

    private final RestClient restClient;

    TcmbExchangeRateProvider(@Qualifier("pricingRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    @Override
    public Map<String, BigDecimal> fetchRates() {
        try {
            byte[] body = restClient.get().uri(URL).retrieve().body(byte[].class);
            return body == null ? Map.of() : parse(body);
        } catch (Exception e) {
            log.warn("TCMB kurları alınamadı: {}", e.toString());
            return Map.of();
        }
    }

    @Override
    public String source() {
        return "TCMB";
    }

    private Map<String, BigDecimal> parse(byte[] xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        DocumentBuilder builder = factory.newDocumentBuilder();
        // Varsayılan işleyici bozuk XML'de stderr'e "[Fatal Error]" basar; hata yine de istisna olarak fırlar.
        builder.setErrorHandler(new ErrorHandler() {
            @Override
            public void warning(SAXParseException e) {
            }

            @Override
            public void error(SAXParseException e) {
            }

            @Override
            public void fatalError(SAXParseException e) {
            }
        });
        Document doc = builder.parse(new ByteArrayInputStream(xml));

        Map<String, BigDecimal> rates = new LinkedHashMap<>();
        NodeList currencies = doc.getElementsByTagName("Currency");
        for (int i = 0; i < currencies.getLength(); i++) {
            Element currency = (Element) currencies.item(i);
            String code = currency.getAttribute("Kod");
            BigDecimal selling = number(currency, "ForexSelling");
            BigDecimal unit = number(currency, "Unit");
            if (code.isBlank() || selling == null || unit == null) {
                continue;
            }
            rates.put(code, selling.divide(unit, 8, RoundingMode.HALF_EVEN));
        }
        if (rates.isEmpty()) {
            log.warn("TCMB yanıtında kullanılabilir kur yok");
        }
        return rates;
    }

    private static BigDecimal number(Element parent, String tag) {
        NodeList nodes = parent.getElementsByTagName(tag);
        if (nodes.getLength() == 0) {
            return null;
        }
        try {
            BigDecimal value = new BigDecimal(nodes.item(0).getTextContent().trim());
            return value.signum() > 0 ? value : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }
}

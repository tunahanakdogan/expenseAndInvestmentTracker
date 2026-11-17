package com.tunahan.finans.pricing;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/pricing")
class InstrumentController {

    private final InstrumentSearchService search;

    InstrumentController(InstrumentSearchService search) {
        this.search = search;
    }

    @GetMapping("/instruments")
    List<Instrument> search(@RequestParam(defaultValue = "") String q) {
        return search.search(q);
    }
}

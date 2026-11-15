package com.tunahan.finans.investment;

import com.tunahan.finans.common.CurrentUser;
import com.tunahan.finans.investment.PortfolioService.PortfolioResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/portfolio")
class PortfolioController {

    private final PortfolioService portfolio;

    PortfolioController(PortfolioService portfolio) {
        this.portfolio = portfolio;
    }

    @GetMapping
    PortfolioResponse portfolio(@AuthenticationPrincipal Jwt jwt) {
        return portfolio.portfolio(CurrentUser.id(jwt));
    }
}

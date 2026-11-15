package com.tunahan.finans.investment;

import com.tunahan.finans.common.AssetType;
import com.tunahan.finans.common.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/assets")
class AssetController {

    private final AssetService assets;

    AssetController(AssetService assets) {
        this.assets = assets;
    }

    @GetMapping
    List<AssetResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return assets.list(CurrentUser.id(jwt)).stream().map(AssetResponse::of).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    AssetResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateAssetRequest request) {
        return AssetResponse.of(
                assets.create(CurrentUser.id(jwt), request.type(), request.symbol(), request.name()));
    }

    /** Yalnız ad değişir; tür ve sembol fiyat anahtarıdır, yanlış girilen varlık silinip yeniden açılır. */
    @PutMapping("/{id}")
    AssetResponse rename(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                         @Valid @RequestBody UpdateAssetRequest request) {
        return AssetResponse.of(assets.rename(CurrentUser.id(jwt), id, request.name()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        assets.delete(CurrentUser.id(jwt), id);
    }

    record CreateAssetRequest(@NotNull AssetType type, @NotBlank @Size(max = 30) String symbol,
                              @NotBlank @Size(max = 100) String name) {
    }

    record UpdateAssetRequest(@NotBlank @Size(max = 100) String name) {
    }

    record AssetResponse(Long id, AssetType type, String symbol, String name, String currency) {

        static AssetResponse of(Asset asset) {
            return new AssetResponse(asset.getId(), asset.getType(), asset.getSymbol(), asset.getName(),
                    asset.getCurrency());
        }
    }
}

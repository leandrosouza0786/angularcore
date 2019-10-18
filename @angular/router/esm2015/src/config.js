/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EmptyOutletComponent } from './components/empty_outlet';
import { PRIMARY_OUTLET } from './shared';
/**
 * See `Routes` for more details.
 *
 * \@publicApi
 * @record
 */
export function Route() { }
if (false) {
    /** @type {?|undefined} */
    Route.prototype.path;
    /** @type {?|undefined} */
    Route.prototype.pathMatch;
    /** @type {?|undefined} */
    Route.prototype.matcher;
    /** @type {?|undefined} */
    Route.prototype.component;
    /** @type {?|undefined} */
    Route.prototype.redirectTo;
    /** @type {?|undefined} */
    Route.prototype.outlet;
    /** @type {?|undefined} */
    Route.prototype.canActivate;
    /** @type {?|undefined} */
    Route.prototype.canActivateChild;
    /** @type {?|undefined} */
    Route.prototype.canDeactivate;
    /** @type {?|undefined} */
    Route.prototype.canLoad;
    /** @type {?|undefined} */
    Route.prototype.data;
    /** @type {?|undefined} */
    Route.prototype.resolve;
    /** @type {?|undefined} */
    Route.prototype.children;
    /** @type {?|undefined} */
    Route.prototype.loadChildren;
    /** @type {?|undefined} */
    Route.prototype.runGuardsAndResolvers;
    /**
     * Filled for routes with `loadChildren` once the module has been loaded
     * \@internal
     * @type {?|undefined}
     */
    Route.prototype._loadedConfig;
}
export class LoadedRouterConfig {
    /**
     * @param {?} routes
     * @param {?} module
     */
    constructor(routes, module) {
        this.routes = routes;
        this.module = module;
    }
}
if (false) {
    /** @type {?} */
    LoadedRouterConfig.prototype.routes;
    /** @type {?} */
    LoadedRouterConfig.prototype.module;
}
/**
 * @param {?} config
 * @param {?=} parentPath
 * @return {?}
 */
export function validateConfig(config, parentPath = '') {
    // forEach doesn't iterate undefined values
    for (let i = 0; i < config.length; i++) {
        /** @type {?} */
        const route = config[i];
        /** @type {?} */
        const fullPath = getFullPath(parentPath, route);
        validateNode(route, fullPath);
    }
}
/**
 * @param {?} route
 * @param {?} fullPath
 * @return {?}
 */
function validateNode(route, fullPath) {
    if (!route) {
        throw new Error(`
      Invalid configuration of route '${fullPath}': Encountered undefined route.
      The reason might be an extra comma.

      Example:
      const routes: Routes = [
        { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
        { path: 'dashboard',  component: DashboardComponent },, << two commas
        { path: 'detail/:id', component: HeroDetailComponent }
      ];
    `);
    }
    if (Array.isArray(route)) {
        throw new Error(`Invalid configuration of route '${fullPath}': Array cannot be specified`);
    }
    if (!route.component && !route.children && !route.loadChildren &&
        (route.outlet && route.outlet !== PRIMARY_OUTLET)) {
        throw new Error(`Invalid configuration of route '${fullPath}': a componentless route without children or loadChildren cannot have a named outlet set`);
    }
    if (route.redirectTo && route.children) {
        throw new Error(`Invalid configuration of route '${fullPath}': redirectTo and children cannot be used together`);
    }
    if (route.redirectTo && route.loadChildren) {
        throw new Error(`Invalid configuration of route '${fullPath}': redirectTo and loadChildren cannot be used together`);
    }
    if (route.children && route.loadChildren) {
        throw new Error(`Invalid configuration of route '${fullPath}': children and loadChildren cannot be used together`);
    }
    if (route.redirectTo && route.component) {
        throw new Error(`Invalid configuration of route '${fullPath}': redirectTo and component cannot be used together`);
    }
    if (route.path && route.matcher) {
        throw new Error(`Invalid configuration of route '${fullPath}': path and matcher cannot be used together`);
    }
    if (route.redirectTo === void 0 && !route.component && !route.children && !route.loadChildren) {
        throw new Error(`Invalid configuration of route '${fullPath}'. One of the following must be provided: component, redirectTo, children or loadChildren`);
    }
    if (route.path === void 0 && route.matcher === void 0) {
        throw new Error(`Invalid configuration of route '${fullPath}': routes must have either a path or a matcher specified`);
    }
    if (typeof route.path === 'string' && route.path.charAt(0) === '/') {
        throw new Error(`Invalid configuration of route '${fullPath}': path cannot start with a slash`);
    }
    if (route.path === '' && route.redirectTo !== void 0 && route.pathMatch === void 0) {
        /** @type {?} */
        const exp = `The default value of 'pathMatch' is 'prefix', but often the intent is to use 'full'.`;
        throw new Error(`Invalid configuration of route '{path: "${fullPath}", redirectTo: "${route.redirectTo}"}': please provide 'pathMatch'. ${exp}`);
    }
    if (route.pathMatch !== void 0 && route.pathMatch !== 'full' && route.pathMatch !== 'prefix') {
        throw new Error(`Invalid configuration of route '${fullPath}': pathMatch can only be set to 'prefix' or 'full'`);
    }
    if (route.children) {
        validateConfig(route.children, fullPath);
    }
}
/**
 * @param {?} parentPath
 * @param {?} currentRoute
 * @return {?}
 */
function getFullPath(parentPath, currentRoute) {
    if (!currentRoute) {
        return parentPath;
    }
    if (!parentPath && !currentRoute.path) {
        return '';
    }
    else if (parentPath && !currentRoute.path) {
        return `${parentPath}/`;
    }
    else if (!parentPath && currentRoute.path) {
        return currentRoute.path;
    }
    else {
        return `${parentPath}/${currentRoute.path}`;
    }
}
/**
 * Makes a copy of the config and adds any default required properties.
 * @param {?} r
 * @return {?}
 */
export function standardizeConfig(r) {
    /** @type {?} */
    const children = r.children && r.children.map(standardizeConfig);
    /** @type {?} */
    const c = children ? Object.assign({}, r, { children }) : Object.assign({}, r);
    if (!c.component && (children || c.loadChildren) && (c.outlet && c.outlet !== PRIMARY_OUTLET)) {
        c.component = EmptyOutletComponent;
    }
    return c;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFXQSxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUUvRCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sVUFBVSxDQUFDOzs7Ozs7O0FBc1h4QywyQkFxQkM7OztJQXBCQyxxQkFBYzs7SUFDZCwwQkFBbUI7O0lBQ25CLHdCQUFxQjs7SUFDckIsMEJBQXNCOztJQUN0QiwyQkFBb0I7O0lBQ3BCLHVCQUFnQjs7SUFDaEIsNEJBQW9COztJQUNwQixpQ0FBeUI7O0lBQ3pCLDhCQUFzQjs7SUFDdEIsd0JBQWdCOztJQUNoQixxQkFBWTs7SUFDWix3QkFBc0I7O0lBQ3RCLHlCQUFrQjs7SUFDbEIsNkJBQTRCOztJQUM1QixzQ0FBOEM7Ozs7OztJQUs5Qyw4QkFBbUM7O0FBR3JDLE1BQU0sT0FBTyxrQkFBa0I7Ozs7O0lBQzdCLFlBQW1CLE1BQWUsRUFBUyxNQUF3QjtRQUFoRCxXQUFNLEdBQU4sTUFBTSxDQUFTO1FBQVMsV0FBTSxHQUFOLE1BQU0sQ0FBa0I7SUFBRyxDQUFDO0NBQ3hFOzs7SUFEYSxvQ0FBc0I7O0lBQUUsb0NBQStCOzs7Ozs7O0FBR3JFLE1BQU0sVUFBVSxjQUFjLENBQUMsTUFBYyxFQUFFLGFBQXFCLEVBQUU7SUFDcEUsMkNBQTJDO0lBQzNDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFOztjQUNoQyxLQUFLLEdBQVUsTUFBTSxDQUFDLENBQUMsQ0FBQzs7Y0FDeEIsUUFBUSxHQUFXLFdBQVcsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDO1FBQ3ZELFlBQVksQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7S0FD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QUFNLEtBQUssY0FBYyxDQUFDLEVBQUU7UUFDN0YsQ0FBQyxDQUFDLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQztLQUNwQztJQUNELE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtOZ01vZHVsZUZhY3RvcnksIE5nTW9kdWxlUmVmLCBUeXBlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7T2JzZXJ2YWJsZX0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7RW1wdHlPdXRsZXRDb21wb25lbnR9IGZyb20gJy4vY29tcG9uZW50cy9lbXB0eV9vdXRsZXQnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90fSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BSSU1BUllfT1VUTEVUfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge1VybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cH0gZnJvbSAnLi91cmxfdHJlZSc7XG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIHJvdXRlciBjb25maWd1cmF0aW9uLlxuICpcbiAqIGBSb3V0ZXNgIGlzIGFuIGFycmF5IG9mIHJvdXRlIGNvbmZpZ3VyYXRpb25zLiBFYWNoIG9uZSBoYXMgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICpcbiAqIC0gYHBhdGhgIGlzIGEgc3RyaW5nIHRoYXQgdXNlcyB0aGUgcm91dGUgbWF0Y2hlciBEU0wuXG4gKiAtIGBwYXRoTWF0Y2hgIGlzIGEgc3RyaW5nIHRoYXQgc3BlY2lmaWVzIHRoZSBtYXRjaGluZyBzdHJhdGVneS4gT3B0aW9ucyBhcmUgYHByZWZpeGAgKGRlZmF1bHQpXG4gKiAgIGFuZCBgZnVsbGAuIFNlZSBbTWF0Y2hpbmcgU3RyYXRlZ3ldKCNtYXRjaGluZy1zdHJhdGVneSkgYmVsb3cgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKiAtIGBtYXRjaGVyYCBkZWZpbmVzIGEgY3VzdG9tIHN0cmF0ZWd5IGZvciBwYXRoIG1hdGNoaW5nIGFuZCBzdXBlcnNlZGVzIGBwYXRoYCBhbmQgYHBhdGhNYXRjaGAuXG4gKiAtIGBjb21wb25lbnRgIGlzIGEgY29tcG9uZW50IHR5cGUuXG4gKiAtIGByZWRpcmVjdFRvYCBpcyB0aGUgdXJsIGZyYWdtZW50IHdoaWNoIHdpbGwgcmVwbGFjZSB0aGUgY3VycmVudCBtYXRjaGVkIHNlZ21lbnQuXG4gKiAtIGBvdXRsZXRgIGlzIHRoZSBuYW1lIG9mIHRoZSBvdXRsZXQgdGhlIGNvbXBvbmVudCBzaG91bGQgYmUgcGxhY2VkIGludG8uXG4gKiAtIGBjYW5BY3RpdmF0ZWAgaXMgYW4gYXJyYXkgb2YgREkgdG9rZW5zIHVzZWQgdG8gbG9vayB1cCBDYW5BY3RpdmF0ZSBoYW5kbGVycy4gU2VlXG4gKiAgIGBDYW5BY3RpdmF0ZWAgZm9yIG1vcmUgaW5mby5cbiAqIC0gYGNhbkFjdGl2YXRlQ2hpbGRgIGlzIGFuIGFycmF5IG9mIERJIHRva2VucyB1c2VkIHRvIGxvb2sgdXAgQ2FuQWN0aXZhdGVDaGlsZCBoYW5kbGVycy4gU2VlXG4gKiAgIGBDYW5BY3RpdmF0ZUNoaWxkYCBmb3IgbW9yZSBpbmZvLlxuICogLSBgY2FuRGVhY3RpdmF0ZWAgaXMgYW4gYXJyYXkgb2YgREkgdG9rZW5zIHVzZWQgdG8gbG9vayB1cCBDYW5EZWFjdGl2YXRlIGhhbmRsZXJzLiBTZWVcbiAqICAgYENhbkRlYWN0aXZhdGVgIGZvciBtb3JlIGluZm8uXG4gKiAtIGBjYW5Mb2FkYCBpcyBhbiBhcnJheSBvZiBESSB0b2tlbnMgdXNlZCB0byBsb29rIHVwIENhbkxvYWQgaGFuZGxlcnMuIFNlZVxuICogICBgQ2FuTG9hZGAgZm9yIG1vcmUgaW5mby5cbiAqIC0gYGRhdGFgIGlzIGFkZGl0aW9uYWwgZGF0YSBwcm92aWRlZCB0byB0aGUgY29tcG9uZW50IHZpYSBgQWN0aXZhdGVkUm91dGVgLlxuICogLSBgcmVzb2x2ZWAgaXMgYSBtYXAgb2YgREkgdG9rZW5zIHVzZWQgdG8gbG9vayB1cCBkYXRhIHJlc29sdmVycy4gU2VlIGBSZXNvbHZlYCBmb3IgbW9yZVxuICogICBpbmZvLlxuICogLSBgcnVuR3VhcmRzQW5kUmVzb2x2ZXJzYCBkZWZpbmVzIHdoZW4gZ3VhcmRzIGFuZCByZXNvbHZlcnMgd2lsbCBiZSBydW4uIEJ5IGRlZmF1bHQgdGhleSBydW4gb25seVxuICogICAgd2hlbiB0aGUgbWF0cml4IHBhcmFtZXRlcnMgb2YgdGhlIHJvdXRlIGNoYW5nZS4gT3B0aW9ucyBpbmNsdWRlOlxuICogICAgLSBgcGFyYW1zQ2hhbmdlYCAoZGVmYXVsdCkgLSBSdW4gZ3VhcmRzIGFuZCByZXNvbHZlcnMgd2hlbiBwYXRoIG9yIG1hdHJpeCBwYXJhbXMgY2hhbmdlLiBUaGlzXG4gKiAgICAgIG1vZGUgaWdub3JlcyBxdWVyeSBwYXJhbSBjaGFuZ2VzLlxuICogICAgLSBgcGFyYW1zT3JRdWVyeVBhcmFtc0NoYW5nZWAgLSBHdWFyZHMgYW5kIHJlc29sdmVycyB3aWxsIHJ1biB3aGVuIGFueSBwYXJhbWV0ZXJzIGNoYW5nZS4gVGhpc1xuICogICAgICBpbmNsdWRlcyBwYXRoLCBtYXRyaXgsIGFuZCBxdWVyeSBwYXJhbXMuXG4gKiAgICAtIGBwYXRoUGFyYW1zQ2hhbmdlYCAtIFJ1biBndWFyZHMgYW5kIHJlc29sdmVycyBwYXRoIG9yIGFueSBwYXRoIHBhcmFtcyBjaGFuZ2UuIFRoaXMgbW9kZSBpc1xuICogICAgICB1c2VmdWwgaWYgeW91IHdhbnQgdG8gaWdub3JlIGNoYW5nZXMgdG8gYWxsIG9wdGlvbmFsIHBhcmFtZXRlcnMgc3VjaCBhcyBxdWVyeSAqYW5kKiBtYXRyaXhcbiAqICAgICAgcGFyYW1zLlxuICogICAgLSBgcGF0aFBhcmFtc09yUXVlcnlQYXJhbXNDaGFuZ2VgIC0gU2FtZSBhcyBgcGF0aFBhcmFtc0NoYW5nZWAsIGJ1dCBhbHNvIHJlcnVuIHdoZW4gYW55IHF1ZXJ5XG4gKiAgICAgIHBhcmFtIGNoYW5nZXNcbiAqICAgIC0gYGFsd2F5c2AgLSBSdW4gZ3VhcmRzIGFuZCByZXNvbHZlcnMgb24gZXZlcnkgbmF2aWdhdGlvbi5cbiAqICAgIC0gKGZyb206IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIHRvOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSA9PiBib29sZWFuIC0gVXNlIGEgcHJlZGljYXRlXG4gKiAgICAgIGZ1bmN0aW9uIHdoZW4gbm9uZSBvZiB0aGUgcHJlLWNvbmZpZ3VyZWQgbW9kZXMgZml0IHRoZSBuZWVkcyBvZiB0aGUgYXBwbGljYXRpb24uIEFuIGV4YW1wbGVcbiAqICAgICAgbWlnaHQgYmUgd2hlbiB5b3UgbmVlZCB0byBpZ25vcmUgdXBkYXRlcyB0byBhIHBhcmFtIHN1Y2ggYXMgYHNvcnREaXJlY3Rpb25gLCBidXQgbmVlZCB0b1xuICogICAgICByZWxvYWQgZ3VhcmRzIGFuZCByZXNvbHZlcnMgd2hlbiBjaGFuZ2luZyB0aGUgYHNlYXJjaFJvb3RgIHBhcmFtLlxuICogLSBgY2hpbGRyZW5gIGlzIGFuIGFycmF5IG9mIGNoaWxkIHJvdXRlIGRlZmluaXRpb25zLlxuICogLSBgbG9hZENoaWxkcmVuYCBpcyBhIHJlZmVyZW5jZSB0byBsYXp5IGxvYWRlZCBjaGlsZCByb3V0ZXMuIFNlZSBgTG9hZENoaWxkcmVuYCBmb3IgbW9yZVxuICogICBpbmZvLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKiAjIyMgU2ltcGxlIENvbmZpZ3VyYXRpb25cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gICogIGNvbXBvbmVudDogVGVhbSxcbiAqICAgY2hpbGRyZW46IFt7XG4gKiAgICAgcGF0aDogJ3VzZXIvOm5hbWUnLFxuICogICAgIGNvbXBvbmVudDogVXNlclxuICogICB9XVxuICogfV1cbiAqIGBgYFxuICpcbiAqIFdoZW4gbmF2aWdhdGluZyB0byBgL3RlYW0vMTEvdXNlci9ib2JgLCB0aGUgcm91dGVyIHdpbGwgY3JlYXRlIHRoZSB0ZWFtIGNvbXBvbmVudCB3aXRoIHRoZSB1c2VyXG4gKiBjb21wb25lbnQgaW4gaXQuXG4gKlxuICogIyMjIE11bHRpcGxlIE91dGxldHNcbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgIGNvbXBvbmVudDogVGVhbVxuICogfSwge1xuICogICBwYXRoOiAnY2hhdC86dXNlcicsXG4gKiAgIGNvbXBvbmVudDogQ2hhdFxuICogICBvdXRsZXQ6ICdhdXgnXG4gKiB9XVxuICogYGBgXG4gKlxuICogV2hlbiBuYXZpZ2F0aW5nIHRvIGAvdGVhbS8xMShhdXg6Y2hhdC9qaW0pYCwgdGhlIHJvdXRlciB3aWxsIGNyZWF0ZSB0aGUgdGVhbSBjb21wb25lbnQgbmV4dCB0b1xuICogdGhlIGNoYXQgY29tcG9uZW50LiBUaGUgY2hhdCBjb21wb25lbnQgd2lsbCBiZSBwbGFjZWQgaW50byB0aGUgYXV4IG91dGxldC5cbiAqXG4gKiAjIyMgV2lsZCBDYXJkc1xuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJyoqJyxcbiAqICAgY29tcG9uZW50OiBTaW5rXG4gKiB9XVxuICogYGBgXG4gKlxuICogUmVnYXJkbGVzcyBvZiB3aGVyZSB5b3UgbmF2aWdhdGUgdG8sIHRoZSByb3V0ZXIgd2lsbCBpbnN0YW50aWF0ZSB0aGUgc2luayBjb21wb25lbnQuXG4gKlxuICogIyMjIFJlZGlyZWN0c1xuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgY29tcG9uZW50OiBUZWFtLFxuICogICBjaGlsZHJlbjogW3tcbiAqICAgICBwYXRoOiAnbGVnYWN5L3VzZXIvOm5hbWUnLFxuICogICAgIHJlZGlyZWN0VG86ICd1c2VyLzpuYW1lJ1xuICogICB9LCB7XG4gKiAgICAgcGF0aDogJ3VzZXIvOm5hbWUnLFxuICogICAgIGNvbXBvbmVudDogVXNlclxuICogICB9XVxuICogfV1cbiAqIGBgYFxuICpcbiAqIFdoZW4gbmF2aWdhdGluZyB0byAnL3RlYW0vMTEvbGVnYWN5L3VzZXIvamltJywgdGhlIHJvdXRlciB3aWxsIGNoYW5nZSB0aGUgdXJsIHRvXG4gKiAnL3RlYW0vMTEvdXNlci9qaW0nLCBhbmQgdGhlbiB3aWxsIGluc3RhbnRpYXRlIHRoZSB0ZWFtIGNvbXBvbmVudCB3aXRoIHRoZSB1c2VyIGNvbXBvbmVudFxuICogaW4gaXQuXG4gKlxuICogSWYgdGhlIGByZWRpcmVjdFRvYCB2YWx1ZSBzdGFydHMgd2l0aCBhICcvJywgdGhlbiBpdCBpcyBhbiBhYnNvbHV0ZSByZWRpcmVjdC4gRS5nLiwgaWYgaW4gdGhlXG4gKiBleGFtcGxlIGFib3ZlIHdlIGNoYW5nZSB0aGUgYHJlZGlyZWN0VG9gIHRvIGAvdXNlci86bmFtZWAsIHRoZSByZXN1bHQgdXJsIHdpbGwgYmUgJy91c2VyL2ppbScuXG4gKlxuICogIyMjIEVtcHR5IFBhdGhcbiAqXG4gKiBFbXB0eS1wYXRoIHJvdXRlIGNvbmZpZ3VyYXRpb25zIGNhbiBiZSB1c2VkIHRvIGluc3RhbnRpYXRlIGNvbXBvbmVudHMgdGhhdCBkbyBub3QgJ2NvbnN1bWUnXG4gKiBhbnkgdXJsIHNlZ21lbnRzLiBMZXQncyBsb29rIGF0IHRoZSBmb2xsb3dpbmcgY29uZmlndXJhdGlvbjpcbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgIGNvbXBvbmVudDogVGVhbSxcbiAqICAgY2hpbGRyZW46IFt7XG4gKiAgICAgcGF0aDogJycsXG4gKiAgICAgY29tcG9uZW50OiBBbGxVc2Vyc1xuICogICB9LCB7XG4gKiAgICAgcGF0aDogJ3VzZXIvOm5hbWUnLFxuICogICAgIGNvbXBvbmVudDogVXNlclxuICogICB9XVxuICogfV1cbiAqIGBgYFxuICpcbiAqIFdoZW4gbmF2aWdhdGluZyB0byBgL3RlYW0vMTFgLCB0aGUgcm91dGVyIHdpbGwgaW5zdGFudGlhdGUgdGhlIEFsbFVzZXJzIGNvbXBvbmVudC5cbiAqXG4gKiBFbXB0eS1wYXRoIHJvdXRlcyBjYW4gaGF2ZSBjaGlsZHJlbi5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgIGNvbXBvbmVudDogVGVhbSxcbiAqICAgY2hpbGRyZW46IFt7XG4gKiAgICAgcGF0aDogJycsXG4gKiAgICAgY29tcG9uZW50OiBXcmFwcGVyQ21wLFxuICogICAgIGNoaWxkcmVuOiBbe1xuICogICAgICAgcGF0aDogJ3VzZXIvOm5hbWUnLFxuICogICAgICAgY29tcG9uZW50OiBVc2VyXG4gKiAgICAgfV1cbiAqICAgfV1cbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiBXaGVuIG5hdmlnYXRpbmcgdG8gYC90ZWFtLzExL3VzZXIvamltYCwgdGhlIHJvdXRlciB3aWxsIGluc3RhbnRpYXRlIHRoZSB3cmFwcGVyIGNvbXBvbmVudCB3aXRoXG4gKiB0aGUgdXNlciBjb21wb25lbnQgaW4gaXQuXG4gKlxuICogQW4gZW1wdHkgcGF0aCByb3V0ZSBpbmhlcml0cyBpdHMgcGFyZW50J3MgcGFyYW1zIGFuZCBkYXRhLiBUaGlzIGlzIGJlY2F1c2UgaXQgY2Fubm90IGhhdmUgaXRzXG4gKiBvd24gcGFyYW1zLCBhbmQsIGFzIGEgcmVzdWx0LCBpdCBvZnRlbiB1c2VzIGl0cyBwYXJlbnQncyBwYXJhbXMgYW5kIGRhdGEgYXMgaXRzIG93bi5cbiAqXG4gKiAjIyMgTWF0Y2hpbmcgU3RyYXRlZ3lcbiAqXG4gKiBCeSBkZWZhdWx0IHRoZSByb3V0ZXIgd2lsbCBsb29rIGF0IHdoYXQgaXMgbGVmdCBpbiB0aGUgdXJsLCBhbmQgY2hlY2sgaWYgaXQgc3RhcnRzIHdpdGhcbiAqIHRoZSBzcGVjaWZpZWQgcGF0aCAoZS5nLiwgYC90ZWFtLzExL3VzZXJgIHN0YXJ0cyB3aXRoIGB0ZWFtLzppZGApLlxuICpcbiAqIFdlIGNhbiBjaGFuZ2UgdGhlIG1hdGNoaW5nIHN0cmF0ZWd5IHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSBwYXRoIGNvdmVycyB0aGUgd2hvbGUgdW5jb25zdW1lZCB1cmwsXG4gKiB3aGljaCBpcyBha2luIHRvIGB1bmNvbnN1bWVkVXJsID09PSBwYXRoYCBvciBgJGAgcmVndWxhciBleHByZXNzaW9ucy5cbiAqXG4gKiBUaGlzIGlzIHBhcnRpY3VsYXJseSBpbXBvcnRhbnQgd2hlbiByZWRpcmVjdGluZyBlbXB0eS1wYXRoIHJvdXRlcy5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICcnLFxuICogICBwYXRoTWF0Y2g6ICdwcmVmaXgnLCAvL2RlZmF1bHRcbiAqICAgcmVkaXJlY3RUbzogJ21haW4nXG4gKiB9LCB7XG4gKiAgIHBhdGg6ICdtYWluJyxcbiAqICAgY29tcG9uZW50OiBNYWluXG4gKiB9XVxuICogYGBgXG4gKlxuICogU2luY2UgYW4gZW1wdHkgcGF0aCBpcyBhIHByZWZpeCBvZiBhbnkgdXJsLCBldmVuIHdoZW4gbmF2aWdhdGluZyB0byAnL21haW4nLCB0aGUgcm91dGVyIHdpbGxcbiAqIHN0aWxsIGFwcGx5IHRoZSByZWRpcmVjdC5cbiAqXG4gKiBJZiBgcGF0aE1hdGNoOiBmdWxsYCBpcyBwcm92aWRlZCwgdGhlIHJvdXRlciB3aWxsIGFwcGx5IHRoZSByZWRpcmVjdCBpZiBhbmQgb25seSBpZiBuYXZpZ2F0aW5nIHRvXG4gKiAnLycuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAnJyxcbiAqICAgcGF0aE1hdGNoOiAnZnVsbCcsXG4gKiAgIHJlZGlyZWN0VG86ICdtYWluJ1xuICogfSwge1xuICogICBwYXRoOiAnbWFpbicsXG4gKiAgIGNvbXBvbmVudDogTWFpblxuICogfV1cbiAqIGBgYFxuICpcbiAqICMjIyBDb21wb25lbnRsZXNzIFJvdXRlc1xuICpcbiAqIEl0IGlzIHVzZWZ1bCBhdCB0aW1lcyB0byBoYXZlIHRoZSBhYmlsaXR5IHRvIHNoYXJlIHBhcmFtZXRlcnMgYmV0d2VlbiBzaWJsaW5nIGNvbXBvbmVudHMuXG4gKlxuICogU2F5IHdlIGhhdmUgdHdvIGNvbXBvbmVudHMtLUNoaWxkQ21wIGFuZCBBdXhDbXAtLXRoYXQgd2Ugd2FudCB0byBwdXQgbmV4dCB0byBlYWNoIG90aGVyIGFuZCBib3RoXG4gKiBvZiB0aGVtIHJlcXVpcmUgc29tZSBpZCBwYXJhbWV0ZXIuXG4gKlxuICogT25lIHdheSB0byBkbyB0aGF0IHdvdWxkIGJlIHRvIGhhdmUgYSBib2d1cyBwYXJlbnQgY29tcG9uZW50LCBzbyBib3RoIHRoZSBzaWJsaW5ncyBjYW4gZ2V0IHRoZSBpZFxuICogcGFyYW1ldGVyIGZyb20gaXQuIFRoaXMgaXMgbm90IGlkZWFsLiBJbnN0ZWFkLCB5b3UgY2FuIHVzZSBhIGNvbXBvbmVudGxlc3Mgcm91dGUuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICAgcGF0aDogJ3BhcmVudC86aWQnLFxuICogICAgY2hpbGRyZW46IFtcbiAqICAgICAgeyBwYXRoOiAnYScsIGNvbXBvbmVudDogTWFpbkNoaWxkIH0sXG4gKiAgICAgIHsgcGF0aDogJ2InLCBjb21wb25lbnQ6IEF1eENoaWxkLCBvdXRsZXQ6ICdhdXgnIH1cbiAqICAgIF1cbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiBTbyB3aGVuIG5hdmlnYXRpbmcgdG8gYHBhcmVudC8xMC8oYS8vYXV4OmIpYCwgdGhlIHJvdXRlIHdpbGwgaW5zdGFudGlhdGUgdGhlIG1haW4gY2hpbGQgYW5kIGF1eFxuICogY2hpbGQgY29tcG9uZW50cyBuZXh0IHRvIGVhY2ggb3RoZXIuIEluIHRoaXMgZXhhbXBsZSwgdGhlIGFwcGxpY2F0aW9uIGNvbXBvbmVudFxuICogaGFzIHRvIGhhdmUgdGhlIHByaW1hcnkgYW5kIGF1eCBvdXRsZXRzIGRlZmluZWQuXG4gKlxuICogVGhlIHJvdXRlciB3aWxsIGFsc28gbWVyZ2UgdGhlIGBwYXJhbXNgLCBgZGF0YWAsIGFuZCBgcmVzb2x2ZWAgb2YgdGhlIGNvbXBvbmVudGxlc3MgcGFyZW50IGludG9cbiAqIHRoZSBgcGFyYW1zYCwgYGRhdGFgLCBhbmQgYHJlc29sdmVgIG9mIHRoZSBjaGlsZHJlbi4gVGhpcyBpcyBkb25lIGJlY2F1c2UgdGhlcmUgaXMgbm8gY29tcG9uZW50XG4gKiB0aGF0IGNhbiBpbmplY3QgdGhlIGFjdGl2YXRlZCByb3V0ZSBvZiB0aGUgY29tcG9uZW50bGVzcyBwYXJlbnQuXG4gKlxuICogVGhpcyBpcyBlc3BlY2lhbGx5IHVzZWZ1bCB3aGVuIGNoaWxkIGNvbXBvbmVudHMgYXJlIGRlZmluZWQgYXMgZm9sbG93czpcbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgICBwYXRoOiAncGFyZW50LzppZCcsXG4gKiAgICBjaGlsZHJlbjogW1xuICogICAgICB7IHBhdGg6ICcnLCBjb21wb25lbnQ6IE1haW5DaGlsZCB9LFxuICogICAgICB7IHBhdGg6ICcnLCBjb21wb25lbnQ6IEF1eENoaWxkLCBvdXRsZXQ6ICdhdXgnIH1cbiAqICAgIF1cbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiBXaXRoIHRoaXMgY29uZmlndXJhdGlvbiBpbiBwbGFjZSwgbmF2aWdhdGluZyB0byAnL3BhcmVudC8xMCcgd2lsbCBjcmVhdGUgdGhlIG1haW4gY2hpbGQgYW5kIGF1eFxuICogY29tcG9uZW50cy5cbiAqXG4gKiAjIyMgTGF6eSBMb2FkaW5nXG4gKlxuICogTGF6eSBsb2FkaW5nIHNwZWVkcyB1cCBvdXIgYXBwbGljYXRpb24gbG9hZCB0aW1lIGJ5IHNwbGl0dGluZyBpdCBpbnRvIG11bHRpcGxlIGJ1bmRsZXMsIGFuZFxuICogbG9hZGluZyB0aGVtIG9uIGRlbWFuZC4gVGhlIHJvdXRlciBpcyBkZXNpZ25lZCB0byBtYWtlIGxhenkgbG9hZGluZyBzaW1wbGUgYW5kIGVhc3kuIEluc3RlYWQgb2ZcbiAqIHByb3ZpZGluZyB0aGUgY2hpbGRyZW4gcHJvcGVydHksIHlvdSBjYW4gcHJvdmlkZSB0aGUgYGxvYWRDaGlsZHJlbmAgcHJvcGVydHksIGFzIGZvbGxvd3M6XG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAndGVhbS86aWQnLFxuICogICBjb21wb25lbnQ6IFRlYW0sXG4gKiAgIGxvYWRDaGlsZHJlbjogJ3RlYW0nXG4gKiB9XVxuICogYGBgXG4gKlxuICogVGhlIHJvdXRlciB3aWxsIHVzZSByZWdpc3RlcmVkIE5nTW9kdWxlRmFjdG9yeUxvYWRlciB0byBmZXRjaCBhbiBOZ01vZHVsZSBhc3NvY2lhdGVkIHdpdGggJ3RlYW0nLlxuICogVGhlbiBpdCB3aWxsIGV4dHJhY3QgdGhlIHNldCBvZiByb3V0ZXMgZGVmaW5lZCBpbiB0aGF0IE5nTW9kdWxlLCBhbmQgd2lsbCB0cmFuc3BhcmVudGx5IGFkZFxuICogdGhvc2Ugcm91dGVzIHRvIHRoZSBtYWluIGNvbmZpZ3VyYXRpb24uXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBSb3V0ZXMgPSBSb3V0ZVtdO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvbiBSZXByZXNlbnRzIHRoZSByZXN1bHRzIG9mIHRoZSBVUkwgbWF0Y2hpbmcuXG4gKlxuICogKiBgY29uc3VtZWRgIGlzIGFuIGFycmF5IG9mIHRoZSBjb25zdW1lZCBVUkwgc2VnbWVudHMuXG4gKiAqIGBwb3NQYXJhbXNgIGlzIGEgbWFwIG9mIHBvc2l0aW9uYWwgcGFyYW1ldGVycy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIFVybE1hdGNoUmVzdWx0ID0ge1xuICBjb25zdW1lZDogVXJsU2VnbWVudFtdOyBwb3NQYXJhbXM/OiB7W25hbWU6IHN0cmluZ106IFVybFNlZ21lbnR9O1xufTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBBIGZ1bmN0aW9uIG1hdGNoaW5nIFVSTHNcbiAqXG4gKiBBIGN1c3RvbSBVUkwgbWF0Y2hlciBjYW4gYmUgcHJvdmlkZWQgd2hlbiBhIGNvbWJpbmF0aW9uIG9mIGBwYXRoYCBhbmQgYHBhdGhNYXRjaGAgaXNuJ3RcbiAqIGV4cHJlc3NpdmUgZW5vdWdoLlxuICpcbiAqIEZvciBpbnN0YW5jZSwgdGhlIGZvbGxvd2luZyBtYXRjaGVyIG1hdGNoZXMgaHRtbCBmaWxlcy5cbiAqXG4gKiBgYGBcbiAqIGV4cG9ydCBmdW5jdGlvbiBodG1sRmlsZXModXJsOiBVcmxTZWdtZW50W10pIHtcbiAqICAgcmV0dXJuIHVybC5sZW5ndGggPT09IDEgJiYgdXJsWzBdLnBhdGguZW5kc1dpdGgoJy5odG1sJykgPyAoe2NvbnN1bWVkOiB1cmx9KSA6IG51bGw7XG4gKiB9XG4gKlxuICogZXhwb3J0IGNvbnN0IHJvdXRlcyA9IFt7IG1hdGNoZXI6IGh0bWxGaWxlcywgY29tcG9uZW50OiBBbnlDb21wb25lbnQgfV07XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIFVybE1hdGNoZXIgPSAoc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgZ3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGU6IFJvdXRlKSA9PlxuICAgIFVybE1hdGNoUmVzdWx0O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIHN0YXRpYyBkYXRhIGFzc29jaWF0ZWQgd2l0aCBhIHBhcnRpY3VsYXIgcm91dGUuXG4gKlxuICogU2VlIGBSb3V0ZXNgIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBEYXRhID0ge1xuICBbbmFtZTogc3RyaW5nXTogYW55XG59O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIHJlc29sdmVkIGRhdGEgYXNzb2NpYXRlZCB3aXRoIGEgcGFydGljdWxhciByb3V0ZS5cbiAqXG4gKiBTZWUgYFJvdXRlc2AgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIFJlc29sdmVEYXRhID0ge1xuICBbbmFtZTogc3RyaW5nXTogYW55XG59O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFRoZSB0eXBlIG9mIGBsb2FkQ2hpbGRyZW5gLlxuICpcbiAqIFNlZSBgUm91dGVzYCBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgTG9hZENoaWxkcmVuQ2FsbGJhY2sgPSAoKSA9PlxuICAgIFR5cGU8YW55PnwgTmdNb2R1bGVGYWN0b3J5PGFueT58IFByb21pc2U8VHlwZTxhbnk+PnwgT2JzZXJ2YWJsZTxUeXBlPGFueT4+O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFRoZSB0eXBlIG9mIGBsb2FkQ2hpbGRyZW5gLlxuICpcbiAqIFNlZSBgUm91dGVzYCBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgTG9hZENoaWxkcmVuID0gc3RyaW5nIHwgTG9hZENoaWxkcmVuQ2FsbGJhY2s7XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogVGhlIHR5cGUgb2YgYHF1ZXJ5UGFyYW1zSGFuZGxpbmdgLlxuICpcbiAqIFNlZSBgUm91dGVyTGlua2AgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKi9cbmV4cG9ydCB0eXBlIFF1ZXJ5UGFyYW1zSGFuZGxpbmcgPSAnbWVyZ2UnIHwgJ3ByZXNlcnZlJyB8ICcnO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFRoZSB0eXBlIG9mIGBydW5HdWFyZHNBbmRSZXNvbHZlcnNgLlxuICpcbiAqIFNlZSBgUm91dGVzYCBmb3IgbW9yZSBkZXRhaWxzLlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBSdW5HdWFyZHNBbmRSZXNvbHZlcnMgPSAncGF0aFBhcmFtc0NoYW5nZScgfCAncGF0aFBhcmFtc09yUXVlcnlQYXJhbXNDaGFuZ2UnIHxcbiAgICAncGFyYW1zQ2hhbmdlJyB8ICdwYXJhbXNPclF1ZXJ5UGFyYW1zQ2hhbmdlJyB8ICdhbHdheXMnIHxcbiAgICAoKGZyb206IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIHRvOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSA9PiBib29sZWFuKTtcblxuLyoqXG4gKiBTZWUgYFJvdXRlc2AgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGUge1xuICBwYXRoPzogc3RyaW5nO1xuICBwYXRoTWF0Y2g/OiBzdHJpbmc7XG4gIG1hdGNoZXI/OiBVcmxNYXRjaGVyO1xuICBjb21wb25lbnQ/OiBUeXBlPGFueT47XG4gIHJlZGlyZWN0VG8/OiBzdHJpbmc7XG4gIG91dGxldD86IHN0cmluZztcbiAgY2FuQWN0aXZhdGU/OiBhbnlbXTtcbiAgY2FuQWN0aXZhdGVDaGlsZD86IGFueVtdO1xuICBjYW5EZWFjdGl2YXRlPzogYW55W107XG4gIGNhbkxvYWQ/OiBhbnlbXTtcbiAgZGF0YT86IERhdGE7XG4gIHJlc29sdmU/OiBSZXNvbHZlRGF0YTtcbiAgY2hpbGRyZW4/OiBSb3V0ZXM7XG4gIGxvYWRDaGlsZHJlbj86IExvYWRDaGlsZHJlbjtcbiAgcnVuR3VhcmRzQW5kUmVzb2x2ZXJzPzogUnVuR3VhcmRzQW5kUmVzb2x2ZXJzO1xuICAvKipcbiAgICogRmlsbGVkIGZvciByb3V0ZXMgd2l0aCBgbG9hZENoaWxkcmVuYCBvbmNlIHRoZSBtb2R1bGUgaGFzIGJlZW4gbG9hZGVkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgX2xvYWRlZENvbmZpZz86IExvYWRlZFJvdXRlckNvbmZpZztcbn1cblxuZXhwb3J0IGNsYXNzIExvYWRlZFJvdXRlckNvbmZpZyB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByb3V0ZXM6IFJvdXRlW10sIHB1YmxpYyBtb2R1bGU6IE5nTW9kdWxlUmVmPGFueT4pIHt9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbmZpZyhjb25maWc6IFJvdXRlcywgcGFyZW50UGF0aDogc3RyaW5nID0gJycpOiB2b2lkIHtcbiAgLy8gZm9yRWFjaCBkb2Vzbid0IGl0ZXJhdGUgdW5kZWZpbmVkIHZhbHVlc1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbmZpZy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHJvdXRlOiBSb3V0ZSA9IGNvbmZpZ1tpXTtcbiAgICBjb25zdCBmdWxsUGF0aDogc3RyaW5nID0gZ2V0RnVsbFBhdGgocGFyZW50UGF0aCwgcm91dGUpO1xuICAgIHZhbGlkYXRlTm9kZShyb3V0ZSwgZnVsbFBhdGgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlTm9kZShyb3V0ZTogUm91dGUsIGZ1bGxQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKCFyb3V0ZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgXG4gICAgICBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogRW5jb3VudGVyZWQgdW5kZWZpbmVkIHJvdXRlLlxuICAgICAgVGhlIHJlYXNvbiBtaWdodCBiZSBhbiBleHRyYSBjb21tYS5cblxuICAgICAgRXhhbXBsZTpcbiAgICAgIGNvbnN0IHJvdXRlczogUm91dGVzID0gW1xuICAgICAgICB7IHBhdGg6ICcnLCByZWRpcmVjdFRvOiAnL2Rhc2hib2FyZCcsIHBhdGhNYXRjaDogJ2Z1bGwnIH0sXG4gICAgICAgIHsgcGF0aDogJ2Rhc2hib2FyZCcsICBjb21wb25lbnQ6IERhc2hib2FyZENvbXBvbmVudCB9LCwgPDwgdHdvIGNvbW1hc1xuICAgICAgICB7IHBhdGg6ICdkZXRhaWwvOmlkJywgY29tcG9uZW50OiBIZXJvRGV0YWlsQ29tcG9uZW50IH1cbiAgICAgIF07XG4gICAgYCk7XG4gIH1cbiAgaWYgKEFycmF5LmlzQXJyYXkocm91dGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogQXJyYXkgY2Fubm90IGJlIHNwZWNpZmllZGApO1xuICB9XG4gIGlmICghcm91dGUuY29tcG9uZW50ICYmICFyb3V0ZS5jaGlsZHJlbiAmJiAhcm91dGUubG9hZENoaWxkcmVuICYmXG4gICAgICAocm91dGUub3V0bGV0ICYmIHJvdXRlLm91dGxldCAhPT0gUFJJTUFSWV9PVVRMRVQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IGEgY29tcG9uZW50bGVzcyByb3V0ZSB3aXRob3V0IGNoaWxkcmVuIG9yIGxvYWRDaGlsZHJlbiBjYW5ub3QgaGF2ZSBhIG5hbWVkIG91dGxldCBzZXRgKTtcbiAgfVxuICBpZiAocm91dGUucmVkaXJlY3RUbyAmJiByb3V0ZS5jaGlsZHJlbikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiByZWRpcmVjdFRvIGFuZCBjaGlsZHJlbiBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmApO1xuICB9XG4gIGlmIChyb3V0ZS5yZWRpcmVjdFRvICYmIHJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiByZWRpcmVjdFRvIGFuZCBsb2FkQ2hpbGRyZW4gY2Fubm90IGJlIHVzZWQgdG9nZXRoZXJgKTtcbiAgfVxuICBpZiAocm91dGUuY2hpbGRyZW4gJiYgcm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IGNoaWxkcmVuIGFuZCBsb2FkQ2hpbGRyZW4gY2Fubm90IGJlIHVzZWQgdG9nZXRoZXJgKTtcbiAgfVxuICBpZiAocm91dGUucmVkaXJlY3RUbyAmJiByb3V0ZS5jb21wb25lbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogcmVkaXJlY3RUbyBhbmQgY29tcG9uZW50IGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gIH1cbiAgaWYgKHJvdXRlLnBhdGggJiYgcm91dGUubWF0Y2hlcikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBwYXRoIGFuZCBtYXRjaGVyIGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gIH1cbiAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gPT09IHZvaWQgMCAmJiAhcm91dGUuY29tcG9uZW50ICYmICFyb3V0ZS5jaGlsZHJlbiAmJiAhcm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofScuIE9uZSBvZiB0aGUgZm9sbG93aW5nIG11c3QgYmUgcHJvdmlkZWQ6IGNvbXBvbmVudCwgcmVkaXJlY3RUbywgY2hpbGRyZW4gb3IgbG9hZENoaWxkcmVuYCk7XG4gIH1cbiAgaWYgKHJvdXRlLnBhdGggPT09IHZvaWQgMCAmJiByb3V0ZS5tYXRjaGVyID09PSB2b2lkIDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9Jzogcm91dGVzIG11c3QgaGF2ZSBlaXRoZXIgYSBwYXRoIG9yIGEgbWF0Y2hlciBzcGVjaWZpZWRgKTtcbiAgfVxuICBpZiAodHlwZW9mIHJvdXRlLnBhdGggPT09ICdzdHJpbmcnICYmIHJvdXRlLnBhdGguY2hhckF0KDApID09PSAnLycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBwYXRoIGNhbm5vdCBzdGFydCB3aXRoIGEgc2xhc2hgKTtcbiAgfVxuICBpZiAocm91dGUucGF0aCA9PT0gJycgJiYgcm91dGUucmVkaXJlY3RUbyAhPT0gdm9pZCAwICYmIHJvdXRlLnBhdGhNYXRjaCA9PT0gdm9pZCAwKSB7XG4gICAgY29uc3QgZXhwID1cbiAgICAgICAgYFRoZSBkZWZhdWx0IHZhbHVlIG9mICdwYXRoTWF0Y2gnIGlzICdwcmVmaXgnLCBidXQgb2Z0ZW4gdGhlIGludGVudCBpcyB0byB1c2UgJ2Z1bGwnLmA7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICd7cGF0aDogXCIke2Z1bGxQYXRofVwiLCByZWRpcmVjdFRvOiBcIiR7cm91dGUucmVkaXJlY3RUb31cIn0nOiBwbGVhc2UgcHJvdmlkZSAncGF0aE1hdGNoJy4gJHtleHB9YCk7XG4gIH1cbiAgaWYgKHJvdXRlLnBhdGhNYXRjaCAhPT0gdm9pZCAwICYmIHJvdXRlLnBhdGhNYXRjaCAhPT0gJ2Z1bGwnICYmIHJvdXRlLnBhdGhNYXRjaCAhPT0gJ3ByZWZpeCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogcGF0aE1hdGNoIGNhbiBvbmx5IGJlIHNldCB0byAncHJlZml4JyBvciAnZnVsbCdgKTtcbiAgfVxuICBpZiAocm91dGUuY2hpbGRyZW4pIHtcbiAgICB2YWxpZGF0ZUNvbmZpZyhyb3V0ZS5jaGlsZHJlbiwgZnVsbFBhdGgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEZ1bGxQYXRoKHBhcmVudFBhdGg6IHN0cmluZywgY3VycmVudFJvdXRlOiBSb3V0ZSk6IHN0cmluZyB7XG4gIGlmICghY3VycmVudFJvdXRlKSB7XG4gICAgcmV0dXJuIHBhcmVudFBhdGg7XG4gIH1cbiAgaWYgKCFwYXJlbnRQYXRoICYmICFjdXJyZW50Um91dGUucGF0aCkge1xuICAgIHJldHVybiAnJztcbiAgfSBlbHNlIGlmIChwYXJlbnRQYXRoICYmICFjdXJyZW50Um91dGUucGF0aCkge1xuICAgIHJldHVybiBgJHtwYXJlbnRQYXRofS9gO1xuICB9IGVsc2UgaWYgKCFwYXJlbnRQYXRoICYmIGN1cnJlbnRSb3V0ZS5wYXRoKSB7XG4gICAgcmV0dXJuIGN1cnJlbnRSb3V0ZS5wYXRoO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBgJHtwYXJlbnRQYXRofS8ke2N1cnJlbnRSb3V0ZS5wYXRofWA7XG4gIH1cbn1cblxuLyoqXG4gKiBNYWtlcyBhIGNvcHkgb2YgdGhlIGNvbmZpZyBhbmQgYWRkcyBhbnkgZGVmYXVsdCByZXF1aXJlZCBwcm9wZXJ0aWVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RhbmRhcmRpemVDb25maWcocjogUm91dGUpOiBSb3V0ZSB7XG4gIGNvbnN0IGNoaWxkcmVuID0gci5jaGlsZHJlbiAmJiByLmNoaWxkcmVuLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gIGNvbnN0IGMgPSBjaGlsZHJlbiA/IHsuLi5yLCBjaGlsZHJlbn0gOiB7Li4ucn07XG4gIGlmICghYy5jb21wb25lbnQgJiYgKGNoaWxkcmVuIHx8IGMubG9hZENoaWxkcmVuKSAmJiAoYy5vdXRsZXQgJiYgYy5vdXRsZXQgIT09IFBSSU1BUllfT1VUTEVUKSkge1xuICAgIGMuY29tcG9uZW50ID0gRW1wdHlPdXRsZXRDb21wb25lbnQ7XG4gIH1cbiAgcmV0dXJuIGM7XG59XG4iXX0=
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { resolveForwardRef } from 'angular2/src/core/di';
import { Type, isBlank, isPresent, isArray, stringify, isString } from 'angular2/src/facade/lang';
import { StringMapWrapper } from 'angular2/src/facade/collection';
import { BaseException } from 'angular2/src/facade/exceptions';
import { NoAnnotationError } from 'angular2/src/core/di/reflective_exceptions';
import * as cpl from './compile_metadata';
import * as md from 'angular2/src/core/metadata/directives';
import * as dimd from 'angular2/src/core/metadata/di';
import { DirectiveResolver } from './directive_resolver';
import { PipeResolver } from './pipe_resolver';
import { ViewResolver } from './view_resolver';
import { hasLifecycleHook } from './directive_lifecycle_reflector';
import { LIFECYCLE_HOOKS_VALUES } from 'angular2/src/core/metadata/lifecycle_hooks';
import { reflector } from 'angular2/src/core/reflection/reflection';
import { Injectable, Inject, Optional } from 'angular2/src/core/di';
import { PLATFORM_DIRECTIVES, PLATFORM_PIPES } from 'angular2/src/core/platform_directives_and_pipes';
import { MODULE_SUFFIX, sanitizeIdentifier } from './util';
import { assertArrayOfStrings } from './assertions';
import { getUrlScheme } from 'angular2/src/compiler/url_resolver';
import { Provider } from 'angular2/src/core/di/provider';
import { constructDependencies } from 'angular2/src/core/di/reflective_provider';
import { SelfMetadata, HostMetadata, SkipSelfMetadata } from 'angular2/src/core/di/metadata';
import { AttributeMetadata } from 'angular2/src/core/metadata/di';
export let RuntimeMetadataResolver = class RuntimeMetadataResolver {
    constructor(_directiveResolver, _pipeResolver, _viewResolver, _platformDirectives, _platformPipes) {
        this._directiveResolver = _directiveResolver;
        this._pipeResolver = _pipeResolver;
        this._viewResolver = _viewResolver;
        this._platformDirectives = _platformDirectives;
        this._platformPipes = _platformPipes;
        this._directiveCache = new Map();
        this._pipeCache = new Map();
        this._anonymousTypes = new Map();
        this._anonymousTypeIndex = 0;
    }
    sanitizeTokenName(token) {
        let identifier = stringify(token);
        if (identifier.indexOf('(') >= 0) {
            // case: anonymous functions!
            let found = this._anonymousTypes.get(token);
            if (isBlank(found)) {
                this._anonymousTypes.set(token, this._anonymousTypeIndex++);
                found = this._anonymousTypes.get(token);
            }
            identifier = `anonymous_token_${found}_`;
        }
        return sanitizeIdentifier(identifier);
    }
    getDirectiveMetadata(directiveType) {
        var meta = this._directiveCache.get(directiveType);
        if (isBlank(meta)) {
            var dirMeta = this._directiveResolver.resolve(directiveType);
            var moduleUrl = null;
            var templateMeta = null;
            var changeDetectionStrategy = null;
            var viewProviders = [];
            if (dirMeta instanceof md.ComponentMetadata) {
                assertArrayOfStrings('styles', dirMeta.styles);
                var cmpMeta = dirMeta;
                moduleUrl = calcModuleUrl(directiveType, cmpMeta);
                var viewMeta = this._viewResolver.resolve(directiveType);
                assertArrayOfStrings('styles', viewMeta.styles);
                templateMeta = new cpl.CompileTemplateMetadata({
                    encapsulation: viewMeta.encapsulation,
                    template: viewMeta.template,
                    templateUrl: viewMeta.templateUrl,
                    styles: viewMeta.styles,
                    styleUrls: viewMeta.styleUrls
                });
                changeDetectionStrategy = cmpMeta.changeDetection;
                if (isPresent(dirMeta.viewProviders)) {
                    viewProviders = this.getProvidersMetadata(dirMeta.viewProviders);
                }
            }
            var providers = [];
            if (isPresent(dirMeta.providers)) {
                providers = this.getProvidersMetadata(dirMeta.providers);
            }
            var queries = [];
            var viewQueries = [];
            if (isPresent(dirMeta.queries)) {
                queries = this.getQueriesMetadata(dirMeta.queries, false);
                viewQueries = this.getQueriesMetadata(dirMeta.queries, true);
            }
            meta = cpl.CompileDirectiveMetadata.create({
                selector: dirMeta.selector,
                exportAs: dirMeta.exportAs,
                isComponent: isPresent(templateMeta),
                type: this.getTypeMetadata(directiveType, moduleUrl),
                template: templateMeta,
                changeDetection: changeDetectionStrategy,
                inputs: dirMeta.inputs,
                outputs: dirMeta.outputs,
                host: dirMeta.host,
                lifecycleHooks: LIFECYCLE_HOOKS_VALUES.filter(hook => hasLifecycleHook(hook, directiveType)),
                providers: providers,
                viewProviders: viewProviders,
                queries: queries,
                viewQueries: viewQueries
            });
            this._directiveCache.set(directiveType, meta);
        }
        return meta;
    }
    getTypeMetadata(type, moduleUrl) {
        return new cpl.CompileTypeMetadata({
            name: this.sanitizeTokenName(type),
            moduleUrl: moduleUrl,
            runtime: type,
            diDeps: this.getDependenciesMetadata(type, null)
        });
    }
    getFactoryMetadata(factory, moduleUrl) {
        return new cpl.CompileFactoryMetadata({
            name: this.sanitizeTokenName(factory),
            moduleUrl: moduleUrl,
            runtime: factory,
            diDeps: this.getDependenciesMetadata(factory, null)
        });
    }
    getPipeMetadata(pipeType) {
        var meta = this._pipeCache.get(pipeType);
        if (isBlank(meta)) {
            var pipeMeta = this._pipeResolver.resolve(pipeType);
            var moduleUrl = reflector.importUri(pipeType);
            meta = new cpl.CompilePipeMetadata({
                type: this.getTypeMetadata(pipeType, moduleUrl),
                name: pipeMeta.name,
                pure: pipeMeta.pure,
                lifecycleHooks: LIFECYCLE_HOOKS_VALUES.filter(hook => hasLifecycleHook(hook, pipeType)),
            });
            this._pipeCache.set(pipeType, meta);
        }
        return meta;
    }
    getViewDirectivesMetadata(component) {
        var view = this._viewResolver.resolve(component);
        var directives = flattenDirectives(view, this._platformDirectives);
        for (var i = 0; i < directives.length; i++) {
            if (!isValidType(directives[i])) {
                throw new BaseException(`Unexpected directive value '${stringify(directives[i])}' on the View of component '${stringify(component)}'`);
            }
        }
        return directives.map(type => this.getDirectiveMetadata(type));
    }
    getViewPipesMetadata(component) {
        var view = this._viewResolver.resolve(component);
        var pipes = flattenPipes(view, this._platformPipes);
        for (var i = 0; i < pipes.length; i++) {
            if (!isValidType(pipes[i])) {
                throw new BaseException(`Unexpected piped value '${stringify(pipes[i])}' on the View of component '${stringify(component)}'`);
            }
        }
        return pipes.map(type => this.getPipeMetadata(type));
    }
    getDependenciesMetadata(typeOrFunc, dependencies) {
        var deps;
        try {
            deps = constructDependencies(typeOrFunc, dependencies);
        }
        catch (e) {
            if (e instanceof NoAnnotationError) {
                deps = [];
            }
            else {
                throw e;
            }
        }
        return deps.map((dep) => {
            var compileToken;
            var p = dep.properties.find(p => p instanceof AttributeMetadata);
            var isAttribute = false;
            if (isPresent(p)) {
                compileToken = this.getTokenMetadata(p.attributeName);
                isAttribute = true;
            }
            else {
                compileToken = this.getTokenMetadata(dep.key.token);
            }
            var compileQuery = null;
            var q = dep.properties.find(p => p instanceof dimd.QueryMetadata);
            if (isPresent(q)) {
                compileQuery = this.getQueryMetadata(q, null);
            }
            return new cpl.CompileDiDependencyMetadata({
                isAttribute: isAttribute,
                isHost: dep.upperBoundVisibility instanceof HostMetadata,
                isSelf: dep.upperBoundVisibility instanceof SelfMetadata,
                isSkipSelf: dep.lowerBoundVisibility instanceof SkipSelfMetadata,
                isOptional: dep.optional,
                query: isPresent(q) && !q.isViewQuery ? compileQuery : null,
                viewQuery: isPresent(q) && q.isViewQuery ? compileQuery : null,
                token: compileToken
            });
        });
    }
    getTokenMetadata(token) {
        token = resolveForwardRef(token);
        var compileToken;
        if (isString(token)) {
            compileToken = new cpl.CompileTokenMetadata({ value: token });
        }
        else {
            compileToken = new cpl.CompileTokenMetadata({
                identifier: new cpl.CompileIdentifierMetadata({ runtime: token, name: this.sanitizeTokenName(token) })
            });
        }
        return compileToken;
    }
    getProvidersMetadata(providers) {
        return providers.map((provider) => {
            provider = resolveForwardRef(provider);
            if (isArray(provider)) {
                return this.getProvidersMetadata(provider);
            }
            else if (provider instanceof Provider) {
                return this.getProviderMetadata(provider);
            }
            else {
                return this.getTypeMetadata(provider, null);
            }
        });
    }
    getProviderMetadata(provider) {
        var compileDeps;
        if (isPresent(provider.useClass)) {
            compileDeps = this.getDependenciesMetadata(provider.useClass, provider.dependencies);
        }
        else if (isPresent(provider.useFactory)) {
            compileDeps = this.getDependenciesMetadata(provider.useFactory, provider.dependencies);
        }
        return new cpl.CompileProviderMetadata({
            token: this.getTokenMetadata(provider.token),
            useClass: isPresent(provider.useClass) ? this.getTypeMetadata(provider.useClass, null) : null,
            useValue: isPresent(provider.useValue) ?
                new cpl.CompileIdentifierMetadata({ runtime: provider.useValue }) :
                null,
            useFactory: isPresent(provider.useFactory) ?
                this.getFactoryMetadata(provider.useFactory, null) :
                null,
            useExisting: isPresent(provider.useExisting) ? this.getTokenMetadata(provider.useExisting) :
                null,
            deps: compileDeps,
            multi: provider.multi
        });
    }
    getQueriesMetadata(queries, isViewQuery) {
        var compileQueries = [];
        StringMapWrapper.forEach(queries, (query, propertyName) => {
            if (query.isViewQuery === isViewQuery) {
                compileQueries.push(this.getQueryMetadata(query, propertyName));
            }
        });
        return compileQueries;
    }
    getQueryMetadata(q, propertyName) {
        var selectors;
        if (q.isVarBindingQuery) {
            selectors = q.varBindings.map(varName => this.getTokenMetadata(varName));
        }
        else {
            selectors = [this.getTokenMetadata(q.selector)];
        }
        return new cpl.CompileQueryMetadata({
            selectors: selectors,
            first: q.first,
            descendants: q.descendants,
            propertyName: propertyName,
            read: isPresent(q.read) ? this.getTokenMetadata(q.read) : null
        });
    }
};
RuntimeMetadataResolver = __decorate([
    Injectable(),
    __param(3, Optional()),
    __param(3, Inject(PLATFORM_DIRECTIVES)),
    __param(4, Optional()),
    __param(4, Inject(PLATFORM_PIPES)), 
    __metadata('design:paramtypes', [DirectiveResolver, PipeResolver, ViewResolver, Array, Array])
], RuntimeMetadataResolver);
function flattenDirectives(view, platformDirectives) {
    let directives = [];
    if (isPresent(platformDirectives)) {
        flattenArray(platformDirectives, directives);
    }
    if (isPresent(view.directives)) {
        flattenArray(view.directives, directives);
    }
    return directives;
}
function flattenPipes(view, platformPipes) {
    let pipes = [];
    if (isPresent(platformPipes)) {
        flattenArray(platformPipes, pipes);
    }
    if (isPresent(view.pipes)) {
        flattenArray(view.pipes, pipes);
    }
    return pipes;
}
function flattenArray(tree, out) {
    for (var i = 0; i < tree.length; i++) {
        var item = resolveForwardRef(tree[i]);
        if (isArray(item)) {
            flattenArray(item, out);
        }
        else {
            out.push(item);
        }
    }
}
function isValidType(value) {
    return isPresent(value) && (value instanceof Type);
}
function calcModuleUrl(type, cmpMetadata) {
    var moduleId = cmpMetadata.moduleId;
    if (isPresent(moduleId)) {
        var scheme = getUrlScheme(moduleId);
        return isPresent(scheme) && scheme.length > 0 ? moduleId :
            `package:${moduleId}${MODULE_SUFFIX}`;
    }
    else {
        return reflector.importUri(type);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVudGltZV9tZXRhZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRpZmZpbmdfcGx1Z2luX3dyYXBwZXItb3V0cHV0X3BhdGgtc2w3MGRIOUYudG1wL2FuZ3VsYXIyL3NyYy9jb21waWxlci9ydW50aW1lX21ldGFkYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSxzQkFBc0I7T0FDL0MsRUFDTCxJQUFJLEVBQ0osT0FBTyxFQUNQLFNBQVMsRUFDVCxPQUFPLEVBQ1AsU0FBUyxFQUNULFFBQVEsRUFHVCxNQUFNLDBCQUEwQjtPQUMxQixFQUFDLGdCQUFnQixFQUFDLE1BQU0sZ0NBQWdDO09BQ3hELEVBQUMsYUFBYSxFQUFDLE1BQU0sZ0NBQWdDO09BQ3JELEVBQUMsaUJBQWlCLEVBQUMsTUFBTSw0Q0FBNEM7T0FDckUsS0FBSyxHQUFHLE1BQU0sb0JBQW9CO09BQ2xDLEtBQUssRUFBRSxNQUFNLHVDQUF1QztPQUNwRCxLQUFLLElBQUksTUFBTSwrQkFBK0I7T0FDOUMsRUFBQyxpQkFBaUIsRUFBQyxNQUFNLHNCQUFzQjtPQUMvQyxFQUFDLFlBQVksRUFBQyxNQUFNLGlCQUFpQjtPQUNyQyxFQUFDLFlBQVksRUFBQyxNQUFNLGlCQUFpQjtPQUVyQyxFQUFDLGdCQUFnQixFQUFDLE1BQU0saUNBQWlDO09BQ3pELEVBQWlCLHNCQUFzQixFQUFDLE1BQU0sNENBQTRDO09BQzFGLEVBQUMsU0FBUyxFQUFDLE1BQU0seUNBQXlDO09BQzFELEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUMsTUFBTSxzQkFBc0I7T0FDMUQsRUFBQyxtQkFBbUIsRUFBRSxjQUFjLEVBQUMsTUFBTSxpREFBaUQ7T0FDNUYsRUFBQyxhQUFhLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSxRQUFRO09BQ2pELEVBQUMsb0JBQW9CLEVBQUMsTUFBTSxjQUFjO09BQzFDLEVBQUMsWUFBWSxFQUFD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QUFJLElBQUksR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xCLFlBQVksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDMUIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqQixDQUFDO0lBQ0gsQ0FBQztBQUNILENBQUM7QUFFRCxxQkFBcUIsS0FBVztJQUM5QixNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxZQUFZLElBQUksQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFFRCx1QkFBdUIsSUFBVSxFQUFFLFdBQWlDO0lBQ2xFLElBQUksUUFBUSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUM7SUFDcEMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixJQUFJLE1BQU0sR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxRQUFRO1lBQ1IsV0FBVyxRQUFRLEdBQUcsYUFBYSxFQUFFLENBQUM7SUFDeEYsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ04sTUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkMsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3Jlc29sdmVGb3J3YXJkUmVmfSBmcm9tICdhbmd1bGFyMi9zcmMvY29yZS9kaSc7XG5pbXBvcnQge1xuICBUeXBlLFxuICBpc0JsYW5rLFxuICBpc1ByZXNlbnQsXG4gIGlzQXJyYXksXG4gIHN0cmluZ2lmeSxcbiAgaXNTdHJpbmcsXG4gIFJlZ0V4cFdyYXBwZXIsXG4gIFN0cmluZ1dyYXBwZXJcbn0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9sYW5nJztcbmltcG9ydCB7U3RyaW5nTWFwV3JhcHBlcn0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9jb2xsZWN0aW9uJztcbmltcG9ydCB7QmFzZUV4Y2VwdGlvbn0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9leGNlcHRpb25zJztcbmltcG9ydCB7Tm9Bbm5vdGF0aW9uRXJyb3J9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb3JlL2RpL3JlZmxlY3RpdmVfZXhjZXB0aW9ucyc7XG5pbXBvcnQgKiBhcyBjcGwgZnJvbSAnLi9jb21waWxlX21ldGFkYXRhJztcbmltcG9ydCAqIGFzIG1kIGZyb20gJ2FuZ3VsYXIyL3NyYy9jb3JlL21ldGFkYXRhL2RpcmVjdGl2ZXMnO1xuaW1wb3J0ICogYXMgZGltZCBmcm9tICdhbmd1bGFyMi9zcmMvY29yZS9tZXRhZGF0YS9kaSc7XG5pbXBvcnQge0RpcmVjdGl2ZVJlc29sdmVyfSBmcm9tICcuL2RpcmVjdGl2ZV9yZXNvbHZlcic7XG5pbXBvcnQge1BpcGVSZXNvbHZlcn0gZnJvbSAnLi9waXBlX3Jlc29sdmVyJztcbmltcG9ydCB7Vmlld1Jlc29sdmVyfSBmcm9tICcuL3ZpZXdfcmVzb2x2ZXInO1xuaW1wb3J0IHtWaWV3TWV0YWRhdGF9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb3JlL21ldGFkYXRhL3ZpZXcnO1xuaW1wb3J0IHtoYXNMaWZlY3ljbGVIb29rfSBmcm9tICcuL2RpcmVjdGl2ZV9saWZlY3ljbGVfcmVmbGVjdG9yJztcbmltcG9ydCB7TGlmZWN5Y2xlSG9va3MsIExJRkVDWUNMRV9IT09LU19WQUxVRVN9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb3JlL21ldGFkYXRhL2xpZmVjeWNsZV9ob29rcyc7XG5pbXBvcnQge3JlZmxlY3Rvcn0gZnJvbSAnYW5ndWxhcjIvc3JjL2NvcmUvcmVmbGVjdGlvbi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW5qZWN0YWJsZSwgSW5qZWN0LCBPcHRpb25hbH0gZnJvbSAnYW5ndWxhcjIvc3JjL2NvcmUvZGknO1xuaW1wb3J0IHtQTEFURk9STV9ESVJFQ1RJVkVTLCBQTEFURk9STV9QSVBFU30gZnJvbSAnYW5ndWxhcjIvc3JjL2NvcmUvcGxhdGZvcm1fZGlyZWN0aXZlc19hbmRfcGlwZXMnO1xuaW1wb3J0IHtNT0RVTEVfU1VGRklYLCBzYW5pdGl6ZUlkZW50aWZpZXJ9IGZyb20gJy4vdXRpbCc7XG5pbXBvcnQge2Fzc2VydEFycmF5T2ZTdHJpbmdzfSBmcm9tICcuL2Fzc2VydGlvbnMnO1xuaW1wb3J0IHtnZXRVcmxTY2hlbWV9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb21waWxlci91cmxfcmVzb2x2ZXInO1xuaW1wb3J0IHtQcm92aWRlcn0gZnJvbSAnYW5ndWxhcjIvc3JjL2NvcmUvZGkvcHJvdmlkZXInO1xuaW1wb3J0IHtcbiAgY29uc3RydWN0RGVwZW5kZW5jaWVzLFxuICBSZWZsZWN0aXZlRGVwZW5kZW5jeVxufSBmcm9tICdhbmd1bGFyMi9zcmMvY29yZS9kaS9yZWZsZWN0aXZlX3Byb3ZpZGVyJztcbmltcG9ydCB7XG4gIE9wdGlvbmFsTWV0YWRhdGEsXG4gIFNlbGZNZXRhZGF0YSxcbiAgSG9zdE1ldGFkYXRhLFxuICBTa2lwU2VsZk1ldGFkYXRhXG59IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb3JlL2RpL21ldGFkYXRhJztcbmltcG9ydCB7QXR0cmlidXRlTWV0YWRhdGF9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb3JlL21ldGFkYXRhL2RpJztcblxuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIFJ1bnRpbWVNZXRhZGF0YVJlc29sdmVyIHtcbiAgcHJpdmF0ZSBfZGlyZWN0aXZlQ2FjaGUgPSBuZXcgTWFwPFR5cGUsIGNwbC5Db21waWxlRGlyZWN0aXZlTWV0YWRhdGE+KCk7XG4gIHByaXZhdGUgX3BpcGVDYWNoZSA9IG5ldyBNYXA8VHlwZSwgY3BsLkNvbXBpbGVQaXBlTWV0YWRhdGE+KCk7XG4gIHByaXZhdGUgX2Fub255bW91c1R5cGVzID0gbmV3IE1hcDxPYmplY3QsIG51bWJlcj4oKTtcbiAgcHJpdmF0ZSBfYW5vbnltb3VzVHlwZUluZGV4ID0gMDtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9kaXJlY3RpdmVSZXNvbHZlcjogRGlyZWN0aXZlUmVzb2x2ZXIsIHByaXZhdGUgX3BpcGVSZXNvbHZlcjogUGlwZVJlc29sdmVyLFxuICAgICAgICAgICAgICBwcml2YXRlIF92aWV3UmVzb2x2ZXI6IFZpZXdSZXNvbHZlcixcbiAgICAgICAgICAgICAgQE9wdGlvbmFsKCkgQEluamVjdChQTEFURk9STV9ESVJFQ1RJVkVTKSBwcml2YXRlIF9wbGF0Zm9ybURpcmVjdGl2ZXM6IFR5cGVbXSxcbiAgICAgICAgICAgICAgQE9wdGlvbmFsKCkgQEluamVjdChQTEFURk9STV9QSVBFUykgcHJpdmF0ZSBfcGxhdGZvcm1QaXBlczogVHlwZVtdKSB7fVxuXG4gIHByaXZhdGUgc2FuaXRpemVUb2tlbk5hbWUodG9rZW46IGFueSk6IHN0cmluZyB7XG4gICAgbGV0IGlkZW50aWZpZXIgPSBzdHJpbmdpZnkodG9rZW4pO1xuICAgIGlmIChpZGVudGlmaWVyLmluZGV4T2YoJygnKSA+PSAwKSB7XG4gICAgICAvLyBjYXNlOiBhbm9ueW1vdXMgZnVuY3Rpb25zIVxuICAgICAgbGV0IGZvdW5kID0gdGhpcy5fYW5vbnltb3VzVHlwZXMuZ2V0KHRva2VuKTtcbiAgICAgIGlmIChpc0JsYW5rKGZvdW5kKSkge1xuICAgICAgICB0aGlzLl9hbm9ueW1vdXNUeXBlcy5zZXQodG9rZW4sIHRoaXMuX2Fub255bW91c1R5cGVJbmRleCsrKTtcbiAgICAgICAgZm91bmQgPSB0aGlzLl9hbm9ueW1vdXNUeXBlcy5nZXQodG9rZW4pO1xuICAgICAgfVxuICAgICAgaWRlbnRpZmllciA9IGBhbm9ueW1vdXNfdG9rZW5fJHtmb3VuZH1fYDtcbiAgICB9XG4gICAgcmV0dXJuIHNhbml0aXplSWRlbnRpZmllcihpZGVudGlmaWVyKTtcbiAgfVxuXG4gIGdldERpcmVjdGl2ZU1ldGFkYXRhKGRpcmVjdGl2ZVR5cGU6IFR5cGUpOiBjcGwuQ29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhIHtcbiAgICB2YXIgbWV0YSA9IHRoaXMuX2RpcmVjdGl2ZUNhY2hlLmdldChkaXJlY3RpdmVUeXBlKTtcbiAgICBpZiAoaXNCbGFuayhtZXRhKSkge1xuICAgICAgdmFyIGRpck1ldGEgPSB0aGlzLl9kaXJlY3RpdmVSZXNvbHZlci5yZXNvbHZlKGRpcmVjdGl2ZVR5cGUpO1xuICAgICAgdmFyIG1vZHVsZVVybCA9IG51bGw7XG4gICAgICB2YXIgdGVtcGxhdGVNZXRhID0gbnVsbDtcbiAgICAgIHZhciBjaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSA9IG51bGw7XG4gICAgICB2YXIgdmlld1Byb3ZpZGVycyA9IFtdO1xuXG4gICAgICBpZiAoZGlyTWV0YSBpbnN0YW5jZW9mIG1kLkNvbXBvbmVudE1ldGFkYXRhKSB7XG4gICAgICAgIGFzc2VydEFycmF5T2ZTdHJpbmdzKCdzdHlsZXMnLCBkaXJNZXRhLnN0eWxlcyk7XG4gICAgICAgIHZhciBjbXBNZXRhID0gPG1kLkNvbXBvbmVudE1ldGFkYXRhPmRpck1ldGE7XG4gICAgICAgIG1vZHVsZVVybCA9IGNhbGNNb2R1bGVVcmwoZGlyZWN0aXZlVHlwZSwgY21wTWV0YSk7XG4gICAgICAgIHZhciB2aWV3TWV0YSA9IHRoaXMuX3ZpZXdSZXNvbHZlci5yZXNvbHZlKGRpcmVjdGl2ZVR5cGUpO1xuICAgICAgICBhc3NlcnRBcnJheU9mU3RyaW5ncygnc3R5bGVzJywgdmlld01ldGEuc3R5bGVzKTtcbiAgICAgICAgdGVtcGxhdGVNZXRhID0gbmV3IGNwbC5Db21waWxlVGVtcGxhdGVNZXRhZGF0YSh7XG4gICAgICAgICAgZW5jYXBzdWxhdGlvbjogdmlld01ldGEuZW5jYXBzdWxhdGlvbixcbiAgICAgICAgICB0ZW1wbGF0ZTogdmlld01ldGEudGVtcGxhdGUsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6IHZpZXdNZXRhLnRlbXBsYXRlVXJsLFxuICAgICAgICAgIHN0eWxlczogdmlld01ldGEuc3R5bGVzLFxuICAgICAgICAgIHN0eWxlVXJsczogdmlld01ldGEuc3R5bGVVcmxzXG4gICAgICAgIH0pO1xuICAgICAgICBjaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSA9IGNtcE1ldGEuY2hhbmdlRGV0ZWN0aW9uO1xuICAgICAgICBpZiAoaXNQcmVzZW50KGRpck1ldGEudmlld1Byb3ZpZGVycykpIHtcbiAgICAgICAgICB2aWV3UHJvdmlkZXJzID0gdGhpcy5nZXRQcm92aWRlcnNNZXRhZGF0YShkaXJNZXRhLnZpZXdQcm92aWRlcnMpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciBwcm92aWRlcnMgPSBbXTtcbiAgICAgIGlmIChpc1ByZXNlbnQoZGlyTWV0YS5wcm92aWRlcnMpKSB7XG4gICAgICAgIHByb3ZpZGVycyA9IHRoaXMuZ2V0UHJvdmlkZXJzTWV0YWRhdGEoZGlyTWV0YS5wcm92aWRlcnMpO1xuICAgICAgfVxuICAgICAgdmFyIHF1ZXJpZXMgPSBbXTtcbiAgICAgIHZhciB2aWV3UXVlcmllcyA9IFtdO1xuICAgICAgaWYgKGlzUHJlc2VudChkaXJNZXRhLnF1ZXJpZXMpKSB7XG4gICAgICAgIHF1ZXJpZXMgPSB0aGlzLmdldFF1ZXJpZXNNZXRhZGF0YShkaXJNZXRhLnF1ZXJpZXMsIGZhbHNlKTtcbiAgICAgICAgdmlld1F1ZXJpZXMgPSB0aGlzLmdldFF1ZXJpZXNNZXRhZGF0YShkaXJNZXRhLnF1ZXJpZXMsIHRydWUpO1xuICAgICAgfVxuICAgICAgbWV0YSA9IGNwbC5Db21waWxlRGlyZWN0aXZlTWV0YWRhdGEuY3JlYXRlKHtcbiAgICAgICAgc2VsZWN0b3I6IGRpck1ldGEuc2VsZWN0b3IsXG4gICAgICAgIGV4cG9ydEFzOiBkaXJNZXRhLmV4cG9ydEFzLFxuICAgICAgICBpc0NvbXBvbmVudDogaXNQcmVzZW50KHRlbXBsYXRlTWV0YSksXG4gICAgICAgIHR5cGU6IHRoaXMuZ2V0VHlwZU1ldGFkYXRhKGRpcmVjdGl2ZVR5cGUsIG1vZHVsZVVybCksXG4gICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZU1ldGEsXG4gICAgICAgIGNoYW5nZURldGVjdGlvbjogY2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gICAgICAgIGlucHV0czogZGlyTWV0YS5pbnB1dHMsXG4gICAgICAgIG91dHB1dHM6IGRpck1ldGEub3V0cHV0cyxcbiAgICAgICAgaG9zdDogZGlyTWV0YS5ob3N0LFxuICAgICAgICBsaWZlY3ljbGVIb29rczpcbiAgICAgICAgICAgIExJRkVDWUNMRV9IT09LU19WQUxVRVMuZmlsdGVyKGhvb2sgPT4gaGFzTGlmZWN5Y2xlSG9vayhob29rLCBkaXJlY3RpdmVUeXBlKSksXG4gICAgICAgIHByb3ZpZGVyczogcHJvdmlkZXJzLFxuICAgICAgICB2aWV3UHJvdmlkZXJzOiB2aWV3UHJvdmlkZXJzLFxuICAgICAgICBxdWVyaWVzOiBxdWVyaWVzLFxuICAgICAgICB2aWV3UXVlcmllczogdmlld1F1ZXJpZXNcbiAgICAgIH0pO1xuICAgICAgdGhpcy5fZGlyZWN0aXZlQ2FjaGUuc2V0KGRpcmVjdGl2ZVR5cGUsIG1ldGEpO1xuICAgIH1cbiAgICByZXR1cm4gbWV0YTtcbiAgfVxuXG4gIGdldFR5cGVNZXRhZGF0YSh0eXBlOiBUeXBlLCBtb2R1bGVVcmw6IHN0cmluZyk6IGNwbC5Db21waWxlVHlwZU1ldGFkYXRhIHtcbiAgICByZXR1cm4gbmV3IGNwbC5Db21waWxlVHlwZU1ldGFkYXRhKHtcbiAgICAgIG5hbWU6IHRoaXMuc2FuaXRpemVUb2tlbk5hbWUodHlwZSksXG4gICAgICBtb2R1bGVVcmw6IG1vZHVsZVVybCxcbiAgICAgIHJ1bnRpbWU6IHR5cGUsXG4gICAgICBkaURlcHM6IHRoaXMuZ2V0RGVwZW5kZW5jaWVzTWV0YWRhdGEodHlwZSwgbnVsbClcbiAgICB9KTtcbiAgfVxuXG4gIGdldEZhY3RvcnlNZXRhZGF0YShmYWN0b3J5OiBGdW5jdGlvbiwgbW9kdWxlVXJsOiBzdHJpbmcpOiBjcGwuQ29tcGlsZUZhY3RvcnlNZXRhZGF0YSB7XG4gICAgcmV0dXJuIG5ldyBjcGwuQ29tcGlsZUZhY3RvcnlNZXRhZGF0YSh7XG4gICAgICBuYW1lOiB0aGlzLnNhbml0aXplVG9rZW5OYW1lKGZhY3RvcnkpLFxuICAgICAgbW9kdWxlVXJsOiBtb2R1bGVVcmwsXG4gICAgICBydW50aW1lOiBmYWN0b3J5LFxuICAgICAgZGlEZXBzOiB0aGlzLmdldERlcGVuZGVuY2llc01ldGFkYXRhKGZhY3RvcnksIG51bGwpXG4gICAgfSk7XG4gIH1cblxuICBnZXRQaXBlTWV0YWRhdGEocGlwZVR5cGU6IFR5cGUpOiBjcGwuQ29tcGlsZVBpcGVNZXRhZGF0YSB7XG4gICAgdmFyIG1ldGEgPSB0aGlzLl9waXBlQ2FjaGUuZ2V0KHBpcGVUeXBlKTtcbiAgICBpZiAoaXNCbGFuayhtZXRhKSkge1xuICAgICAgdmFyIHBpcGVNZXRhID0gdGhpcy5fcGlwZVJlc29sdmVyLnJlc29sdmUocGlwZVR5cGUpO1xuICAgICAgdmFyIG1vZHVsZVVybCA9IHJlZmxlY3Rvci5pbXBvcnRVcmkocGlwZVR5cGUpO1xuICAgICAgbWV0YSA9IG5ldyBjcGwuQ29tcGlsZVBpcGVNZXRhZGF0YSh7XG4gICAgICAgIHR5cGU6IHRoaXMuZ2V0VHlwZU1ldGFkYXRhKHBpcGVUeXBlLCBtb2R1bGVVcmwpLFxuICAgICAgICBuYW1lOiBwaXBlTWV0YS5uYW1lLFxuICAgICAgICBwdXJlOiBwaXBlTWV0YS5wdXJlLFxuICAgICAgICBsaWZlY3ljbGVIb29rczogTElGRUNZQ0xFX0hPT0tTX1ZBTFVFUy5maWx0ZXIoaG9vayA9PiBoYXNMaWZlY3ljbGVIb29rKGhvb2ssIHBpcGVUeXBlKSksXG4gICAgICB9KTtcbiAgICAgIHRoaXMuX3BpcGVDYWNoZS5zZXQocGlwZVR5cGUsIG1ldGEpO1xuICAgIH1cbiAgICByZXR1cm4gbWV0YTtcbiAgfVxuXG4gIGdldFZpZXdEaXJlY3RpdmVzTWV0YWRhdGEoY29tcG9uZW50OiBUeXBlKTogY3BsLkNvbXBpbGVEaXJlY3RpdmVNZXRhZGF0YVtdIHtcbiAgICB2YXIgdmlldyA9IHRoaXMuX3ZpZXdSZXNvbHZlci5yZXNvbHZlKGNvbXBvbmVudCk7XG4gICAgdmFyIGRpcmVjdGl2ZXMgPSBmbGF0dGVuRGlyZWN0aXZlcyh2aWV3LCB0aGlzLl9wbGF0Zm9ybURpcmVjdGl2ZXMpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGlyZWN0aXZlcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFpc1ZhbGlkVHlwZShkaXJlY3RpdmVzW2ldKSkge1xuICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcbiAgICAgICAgICAgIGBVbmV4cGVjdGVkIGRpcmVjdGl2ZSB2YWx1ZSAnJHtzdHJpbmdpZnkoZGlyZWN0aXZlc1tpXSl9JyBvbiB0aGUgVmlldyBvZiBjb21wb25lbnQgJyR7c3RyaW5naWZ5KGNvbXBvbmVudCl9J2ApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkaXJlY3RpdmVzLm1hcCh0eXBlID0+IHRoaXMuZ2V0RGlyZWN0aXZlTWV0YWRhdGEodHlwZSkpO1xuICB9XG5cbiAgZ2V0Vmlld1BpcGVzTWV0YWRhdGEoY29tcG9uZW50OiBUeXBlKTogY3BsLkNvbXBpbGVQaXBlTWV0YWRhdGFbXSB7XG4gICAgdmFyIHZpZXcgPSB0aGlzLl92aWV3UmVzb2x2ZXIucmVzb2x2ZShjb21wb25lbnQpO1xuICAgIHZhciBwaXBlcyA9IGZsYXR0ZW5QaXBlcyh2aWV3LCB0aGlzLl9wbGF0Zm9ybVBpcGVzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBpcGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIWlzVmFsaWRUeXBlKHBpcGVzW2ldKSkge1xuICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcbiAgICAgICAgICAgIGBVbmV4cGVjdGVkIHBpcGVkIHZhbHVlICcke3N0cmluZ2lmeShwaXBlc1tpXSl9JyBvbiB0aGUgVmlldyBvZiBjb21wb25lbnQgJyR7c3RyaW5naWZ5KGNvbXBvbmVudCl9J2ApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGlwZXMubWFwKHR5cGUgPT4gdGhpcy5nZXRQaXBlTWV0YWRhdGEodHlwZSkpO1xuICB9XG5cbiAgZ2V0RGVwZW5kZW5jaWVzTWV0YWRhdGEodHlwZU9yRnVuYzogVHlwZSB8IEZ1bmN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBkZXBlbmRlbmNpZXM6IGFueVtdKTogY3BsLkNvbXBpbGVEaURlcGVuZGVuY3lNZXRhZGF0YVtdIHtcbiAgICB2YXIgZGVwczogUmVmbGVjdGl2ZURlcGVuZGVuY3lbXTtcbiAgICB0cnkge1xuICAgICAgZGVwcyA9IGNvbnN0cnVjdERlcGVuZGVuY2llcyh0eXBlT3JGdW5jLCBkZXBlbmRlbmNpZXMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9Bbm5vdGF0aW9uRXJyb3IpIHtcbiAgICAgICAgZGVwcyA9IFtdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlcHMubWFwKChkZXApID0+IHtcbiAgICAgIHZhciBjb21waWxlVG9rZW47XG4gICAgICB2YXIgcCA9IDxBdHRyaWJ1dGVNZXRhZGF0YT5kZXAucHJvcGVydGllcy5maW5kKHAgPT4gcCBpbnN0YW5jZW9mIEF0dHJpYnV0ZU1ldGFkYXRhKTtcbiAgICAgIHZhciBpc0F0dHJpYnV0ZSA9IGZhbHNlO1xuICAgICAgaWYgKGlzUHJlc2VudChwKSkge1xuICAgICAgICBjb21waWxlVG9rZW4gPSB0aGlzLmdldFRva2VuTWV0YWRhdGEocC5hdHRyaWJ1dGVOYW1lKTtcbiAgICAgICAgaXNBdHRyaWJ1dGUgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGlsZVRva2VuID0gdGhpcy5nZXRUb2tlbk1ldGFkYXRhKGRlcC5rZXkudG9rZW4pO1xuICAgICAgfVxuICAgICAgdmFyIGNvbXBpbGVRdWVyeSA9IG51bGw7XG4gICAgICB2YXIgcSA9IDxkaW1kLlF1ZXJ5TWV0YWRhdGE+ZGVwLnByb3BlcnRpZXMuZmluZChwID0+IHAgaW5zdGFuY2VvZiBkaW1kLlF1ZXJ5TWV0YWRhdGEpO1xuICAgICAgaWYgKGlzUHJlc2VudChxKSkge1xuICAgICAgICBjb21waWxlUXVlcnkgPSB0aGlzLmdldFF1ZXJ5TWV0YWRhdGEocSwgbnVsbCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IGNwbC5Db21waWxlRGlEZXBlbmRlbmN5TWV0YWRhdGEoe1xuICAgICAgICBpc0F0dHJpYnV0ZTogaXNBdHRyaWJ1dGUsXG4gICAgICAgIGlzSG9zdDogZGVwLnVwcGVyQm91bmRWaXNpYmlsaXR5IGluc3RhbmNlb2YgSG9zdE1ldGFkYXRhLFxuICAgICAgICBpc1NlbGY6IGRlcC51cHBlckJvdW5kVmlzaWJpbGl0eSBpbnN0YW5jZW9mIFNlbGZNZXRhZGF0YSxcbiAgICAgICAgaXNTa2lwU2VsZjogZGVwLmxvd2VyQm91bmRWaXNpYmlsaXR5IGluc3RhbmNlb2YgU2tpcFNlbGZNZXRhZGF0YSxcbiAgICAgICAgaXNPcHRpb25hbDogZGVwLm9wdGlvbmFsLFxuICAgICAgICBxdWVyeTogaXNQcmVzZW50KHEpICYmICFxLmlzVmlld1F1ZXJ5ID8gY29tcGlsZVF1ZXJ5IDogbnVsbCxcbiAgICAgICAgdmlld1F1ZXJ5OiBpc1ByZXNlbnQocSkgJiYgcS5pc1ZpZXdRdWVyeSA/IGNvbXBpbGVRdWVyeSA6IG51bGwsXG4gICAgICAgIHRva2VuOiBjb21waWxlVG9rZW5cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0VG9rZW5NZXRhZGF0YSh0b2tlbjogYW55KTogY3BsLkNvbXBpbGVUb2tlbk1ldGFkYXRhIHtcbiAgICB0b2tlbiA9IHJlc29sdmVGb3J3YXJkUmVmKHRva2VuKTtcbiAgICB2YXIgY29tcGlsZVRva2VuO1xuICAgIGlmIChpc1N0cmluZyh0b2tlbikpIHtcbiAgICAgIGNvbXBpbGVUb2tlbiA9IG5ldyBjcGwuQ29tcGlsZVRva2VuTWV0YWRhdGEoe3ZhbHVlOiB0b2tlbn0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21waWxlVG9rZW4gPSBuZXcgY3BsLkNvbXBpbGVUb2tlbk1ldGFkYXRhKHtcbiAgICAgICAgaWRlbnRpZmllcjogbmV3IGNwbC5Db21waWxlSWRlbnRpZmllck1ldGFkYXRhKFxuICAgICAgICAgICAge3J1bnRpbWU6IHRva2VuLCBuYW1lOiB0aGlzLnNhbml0aXplVG9rZW5OYW1lKHRva2VuKX0pXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBpbGVUb2tlbjtcbiAgfVxuXG4gIGdldFByb3ZpZGVyc01ldGFkYXRhKHByb3ZpZGVyczogYW55W10pOlxuICAgICAgQXJyYXk8Y3BsLkNvbXBpbGVQcm92aWRlck1ldGFkYXRhIHwgY3BsLkNvbXBpbGVUeXBlTWV0YWRhdGEgfCBhbnlbXT4ge1xuICAgIHJldHVybiBwcm92aWRlcnMubWFwKChwcm92aWRlcikgPT4ge1xuICAgICAgcHJvdmlkZXIgPSByZXNvbHZlRm9yd2FyZFJlZihwcm92aWRlcik7XG4gICAgICBpZiAoaXNBcnJheShwcm92aWRlcikpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UHJvdmlkZXJzTWV0YWRhdGEocHJvdmlkZXIpO1xuICAgICAgfSBlbHNlIGlmIChwcm92aWRlciBpbnN0YW5jZW9mIFByb3ZpZGVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFByb3ZpZGVyTWV0YWRhdGEocHJvdmlkZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZU1ldGFkYXRhKHByb3ZpZGVyLCBudWxsKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGdldFByb3ZpZGVyTWV0YWRhdGEocHJvdmlkZXI6IFByb3ZpZGVyKTogY3BsLkNvbXBpbGVQcm92aWRlck1ldGFkYXRhIHtcbiAgICB2YXIgY29tcGlsZURlcHM7XG4gICAgaWYgKGlzUHJlc2VudChwcm92aWRlci51c2VDbGFzcykpIHtcbiAgICAgIGNvbXBpbGVEZXBzID0gdGhpcy5nZXREZXBlbmRlbmNpZXNNZXRhZGF0YShwcm92aWRlci51c2VDbGFzcywgcHJvdmlkZXIuZGVwZW5kZW5jaWVzKTtcbiAgICB9IGVsc2UgaWYgKGlzUHJlc2VudChwcm92aWRlci51c2VGYWN0b3J5KSkge1xuICAgICAgY29tcGlsZURlcHMgPSB0aGlzLmdldERlcGVuZGVuY2llc01ldGFkYXRhKHByb3ZpZGVyLnVzZUZhY3RvcnksIHByb3ZpZGVyLmRlcGVuZGVuY2llcyk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgY3BsLkNvbXBpbGVQcm92aWRlck1ldGFkYXRhKHtcbiAgICAgIHRva2VuOiB0aGlzLmdldFRva2VuTWV0YWRhdGEocHJvdmlkZXIudG9rZW4pLFxuICAgICAgdXNlQ2xhc3M6IGlzUHJlc2VudChwcm92aWRlci51c2VDbGFzcykgPyB0aGlzLmdldFR5cGVNZXRhZGF0YShwcm92aWRlci51c2VDbGFzcywgbnVsbCkgOiBudWxsLFxuICAgICAgdXNlVmFsdWU6IGlzUHJlc2VudChwcm92aWRlci51c2VWYWx1ZSkgP1xuICAgICAgICAgICAgICAgICAgICBuZXcgY3BsLkNvbXBpbGVJZGVudGlmaWVyTWV0YWRhdGEoe3J1bnRpbWU6IHByb3ZpZGVyLnVzZVZhbHVlfSkgOlxuICAgICAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgdXNlRmFjdG9yeTogaXNQcmVzZW50KHByb3ZpZGVyLnVzZUZhY3RvcnkpID9cbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdldEZhY3RvcnlNZXRhZGF0YShwcm92aWRlci51c2VGYWN0b3J5LCBudWxsKSA6XG4gICAgICAgICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgIHVzZUV4aXN0aW5nOiBpc1ByZXNlbnQocHJvdmlkZXIudXNlRXhpc3RpbmcpID8gdGhpcy5nZXRUb2tlbk1ldGFkYXRhKHByb3ZpZGVyLnVzZUV4aXN0aW5nKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICBkZXBzOiBjb21waWxlRGVwcyxcbiAgICAgIG11bHRpOiBwcm92aWRlci5tdWx0aVxuICAgIH0pO1xuICB9XG5cbiAgZ2V0UXVlcmllc01ldGFkYXRhKHF1ZXJpZXM6IHtba2V5OiBzdHJpbmddOiBkaW1kLlF1ZXJ5TWV0YWRhdGF9LFxuICAgICAgICAgICAgICAgICAgICAgaXNWaWV3UXVlcnk6IGJvb2xlYW4pOiBjcGwuQ29tcGlsZVF1ZXJ5TWV0YWRhdGFbXSB7XG4gICAgdmFyIGNvbXBpbGVRdWVyaWVzID0gW107XG4gICAgU3RyaW5nTWFwV3JhcHBlci5mb3JFYWNoKHF1ZXJpZXMsIChxdWVyeSwgcHJvcGVydHlOYW1lKSA9PiB7XG4gICAgICBpZiAocXVlcnkuaXNWaWV3UXVlcnkgPT09IGlzVmlld1F1ZXJ5KSB7XG4gICAgICAgIGNvbXBpbGVRdWVyaWVzLnB1c2godGhpcy5nZXRRdWVyeU1ldGFkYXRhKHF1ZXJ5LCBwcm9wZXJ0eU5hbWUpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gY29tcGlsZVF1ZXJpZXM7XG4gIH1cblxuICBnZXRRdWVyeU1ldGFkYXRhKHE6IGRpbWQuUXVlcnlNZXRhZGF0YSwgcHJvcGVydHlOYW1lOiBzdHJpbmcpOiBjcGwuQ29tcGlsZVF1ZXJ5TWV0YWRhdGEge1xuICAgIHZhciBzZWxlY3RvcnM7XG4gICAgaWYgKHEuaXNWYXJCaW5kaW5nUXVlcnkpIHtcbiAgICAgIHNlbGVjdG9ycyA9IHEudmFyQmluZGluZ3MubWFwKHZhck5hbWUgPT4gdGhpcy5nZXRUb2tlbk1ldGFkYXRhKHZhck5hbWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZWN0b3JzID0gW3RoaXMuZ2V0VG9rZW5NZXRhZGF0YShxLnNlbGVjdG9yKV07XG4gICAgfVxuICAgIHJldHVybiBuZXcgY3BsLkNvbXBpbGVRdWVyeU1ldGFkYXRhKHtcbiAgICAgIHNlbGVjdG9yczogc2VsZWN0b3JzLFxuICAgICAgZmlyc3Q6IHEuZmlyc3QsXG4gICAgICBkZXNjZW5kYW50czogcS5kZXNjZW5kYW50cyxcbiAgICAgIHByb3BlcnR5TmFtZTogcHJvcGVydHlOYW1lLFxuICAgICAgcmVhZDogaXNQcmVzZW50KHEucmVhZCkgPyB0aGlzLmdldFRva2VuTWV0YWRhdGEocS5yZWFkKSA6IG51bGxcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmbGF0dGVuRGlyZWN0aXZlcyh2aWV3OiBWaWV3TWV0YWRhdGEsIHBsYXRmb3JtRGlyZWN0aXZlczogYW55W10pOiBUeXBlW10ge1xuICBsZXQgZGlyZWN0aXZlcyA9IFtdO1xuICBpZiAoaXNQcmVzZW50KHBsYXRmb3JtRGlyZWN0aXZlcykpIHtcbiAgICBmbGF0dGVuQXJyYXkocGxhdGZvcm1EaXJlY3RpdmVzLCBkaXJlY3RpdmVzKTtcbiAgfVxuICBpZiAoaXNQcmVzZW50KHZpZXcuZGlyZWN0aXZlcykpIHtcbiAgICBmbGF0dGVuQXJyYXkodmlldy5kaXJlY3RpdmVzLCBkaXJlY3RpdmVzKTtcbiAgfVxuICByZXR1cm4gZGlyZWN0aXZlcztcbn1cblxuZnVuY3Rpb24gZmxhdHRlblBpcGVzKHZpZXc6IFZpZXdNZXRhZGF0YSwgcGxhdGZvcm1QaXBlczogYW55W10pOiBUeXBlW10ge1xuICBsZXQgcGlwZXMgPSBbXTtcbiAgaWYgKGlzUHJlc2VudChwbGF0Zm9ybVBpcGVzKSkge1xuICAgIGZsYXR0ZW5BcnJheShwbGF0Zm9ybVBpcGVzLCBwaXBlcyk7XG4gIH1cbiAgaWYgKGlzUHJlc2VudCh2aWV3LnBpcGVzKSkge1xuICAgIGZsYXR0ZW5BcnJheSh2aWV3LnBpcGVzLCBwaXBlcyk7XG4gIH1cbiAgcmV0dXJuIHBpcGVzO1xufVxuXG5mdW5jdGlvbiBmbGF0dGVuQXJyYXkodHJlZTogYW55W10sIG91dDogQXJyYXk8VHlwZSB8IGFueVtdPik6IHZvaWQge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRyZWUubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IHJlc29sdmVGb3J3YXJkUmVmKHRyZWVbaV0pO1xuICAgIGlmIChpc0FycmF5KGl0ZW0pKSB7XG4gICAgICBmbGF0dGVuQXJyYXkoaXRlbSwgb3V0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0LnB1c2goaXRlbSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGlzVmFsaWRUeXBlKHZhbHVlOiBUeXBlKTogYm9vbGVhbiB7XG4gIHJldHVybiBpc1ByZXNlbnQodmFsdWUpICYmICh2YWx1ZSBpbnN0YW5jZW9mIFR5cGUpO1xufVxuXG5mdW5jdGlvbiBjYWxjTW9kdWxlVXJsKHR5cGU6IFR5cGUsIGNtcE1ldGFkYXRhOiBtZC5Db21wb25lbnRNZXRhZGF0YSk6IHN0cmluZyB7XG4gIHZhciBtb2R1bGVJZCA9IGNtcE1ldGFkYXRhLm1vZHVsZUlkO1xuICBpZiAoaXNQcmVzZW50KG1vZHVsZUlkKSkge1xuICAgIHZhciBzY2hlbWUgPSBnZXRVcmxTY2hlbWUobW9kdWxlSWQpO1xuICAgIHJldHVybiBpc1ByZXNlbnQoc2NoZW1lKSAmJiBzY2hlbWUubGVuZ3RoID4gMCA/IG1vZHVsZUlkIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgcGFja2FnZToke21vZHVsZUlkfSR7TU9EVUxFX1NVRkZJWH1gO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiByZWZsZWN0b3IuaW1wb3J0VXJpKHR5cGUpO1xuICB9XG59XG4iXX0=
library angular2.test.compiler.metadata_resolver_spec;

import "package:angular2/testing_internal.dart"
    show
        ddescribe,
        describe,
        xdescribe,
        it,
        iit,
        xit,
        expect,
        beforeEach,
        afterEach,
        AsyncTestCompleter,
        inject,
        beforeEachProviders;
import "package:angular2/src/facade/lang.dart" show IS_DART, stringify;
import "package:angular2/src/compiler/metadata_resolver.dart"
    show CompileMetadataResolver;
import "package:angular2/src/core/metadata/lifecycle_hooks.dart"
    show LifecycleHooks, LIFECYCLE_HOOKS_VALUES;
import "package:angular2/core.dart"
    show
        Component,
        Directive,
        ViewEncapsulation,
        ChangeDetectionStrategy,
        OnChanges,
        OnInit,
        DoCheck,
        OnDestroy,
        AfterContentInit,
        AfterContentChecked,
        AfterViewInit,
        AfterViewChecked,
        SimpleChange,
        provide;
import "test_bindings.dart" show TEST_PROVIDERS;
import "package:angular2/src/compiler/util.dart" show MODULE_SUFFIX;
import "package:angular2/src/core/platform_directives_and_pipes.dart"
    show PLATFORM_DIRECTIVES;
import "metadata_resolver_fixture.dart" show MalformedStylesComponent;

main() {
  describe("CompileMetadataResolver", () {
    beforeEachProviders(() => TEST_PROVIDERS);
    describe("getMetadata", () {
      it(
          "should read metadata",
          inject([CompileMetadataResolver], (CompileMetadataResolver resolver) {
            var meta = resolver.getDirectiveMetadata(ComponentWithEverything);
            expect(meta.selector).toEqual("someSelector");
            expect(meta.exportAs).toEqual("someExportAs");
            expect(meta.isComponent).toBe(true);
            expect(meta.type.runtime).toBe(ComponentWithEverything);
            expect(meta.type.name).toEqual(stringify(ComponentWithEverything));
            expect(meta.lifecycleHooks).toEqual(LIFECYCLE_HOOKS_VALUES);
            expect(meta.changeDetection)
                .toBe(ChangeDetectionStrategy.CheckAlways);
            expect(meta.inputs).toEqual({"someProp": "someProp"});
            expect(meta.outputs).toEqual({"someEvent": "someEvent"});
            expect(meta.hostListeners)
                .toEqual({"someHostListener": "someHostListenerExpr"});
            expect(meta.hostProperties)
                .toEqual({"someHostProp": "someHostPropExpr"});
            expect(meta.hostAttributes)
                .toEqual({"someHostAttr": "someHostAttrValue"});
            expect(meta.template.encapsulation)
                .toBe(ViewEncapsulation.Emulated);
            expect(meta.template.styles).toEqual(["someStyle"]);
            expect(meta.template.styleUrls).toEqual(["someStyleUrl"]);
            expect(meta.template.template).toEqual("someTemplate");
            expect(meta.template.templateUrl).toEqual("someTemplateUrl");
            expect(meta.template.baseUrl)
                .toEqual('''package:someModuleId${ MODULE_SUFFIX}''');
          }));
      it(
          "should use the moduleUrl from the reflector if none is given",
          inject([CompileMetadataResolver], (CompileMetadataResolver resolver) {
            String value = resolver
                .getDirectiveMetadata(ComponentWithoutModuleId)
                .template
                .baseUrl;
            var expectedEndValue = IS_DART
                ? "test/compiler/metadata_resolver_spec.dart"
                : "./ComponentWithoutModuleId";
            expect(value.endsWith(expectedEndValue)).toBe(true);
          }));
      it(
          "should throw when metadata is incorrectly typed",
          inject([CompileMetadataResolver], (CompileMetadataResolver resolver) {
            if (!IS_DART) {
              expect(() =>
                      resolver.getDirectiveMetadata(MalformedStylesComponent))
                  .toThrowError(
                      '''Expected \'styles\' to be an array of strings.''');
            }
          }));
    });
    describe("getViewDirectivesMetadata", () {
      it(
          "should return the directive metadatas",
          inject([CompileMetadataResolver], (CompileMetadataResolver resolver) {
            expect(resolver.getViewDirectivesMetadata(ComponentWithEverything))
                .toContain(resolver.getDirectiveMetadata(SomeDirective));
          }));
      describe("platform directives", () {
        beforeEachProviders(() => [
              provide(PLATFORM_DIRECTIVES, useValue: [ADirective], multi: true)
            ]);
        it(
            "should include platform directives when available",
            inject([CompileMetadataResolver],
                (CompileMetadataResolver resolver) {
              expect(resolver
                      .getViewDirectivesMetadata(ComponentWithEverything))
                  .toContain(resolver.getDirectiveMetadata(ADirective));
              expect(resolver
                      .getViewDirectivesMetadata(ComponentWithEverything))
                  .toContain(resolver.getDirectiveMetadata(SomeDirective));
            }));
      });
    });
  });
}

@Directive(selector: "a-directive")
class ADirective {}

@Directive(selector: "someSelector")
class SomeDirective {}

@Component(selector: "someComponent", template: "")
class ComponentWithoutModuleId {}

@Component(
    selector: "someSelector",
    inputs: const ["someProp"],
    outputs: const ["someEvent"],
    host: const {
      "[someHostProp]": "someHostPropExpr",
      "(someHostListener)": "someHostListenerExpr",
      "someHostAttr": "someHostAttrValue"
    },
    exportAs: "someExportAs",
    moduleId: "someModuleId",
    changeDetection: ChangeDetectionStrategy.CheckAlways,
    template: "someTemplate",
    templateUrl: "someTemplateUrl",
    encapsulation: ViewEncapsulation.Emulated,
    styles: const ["someStyle"],
    styleUrls: const ["someStyleUrl"],
    directives: const [SomeDirective])
class ComponentWithEverything
    implements
        OnChanges,
        OnInit,
        DoCheck,
        OnDestroy,
        AfterContentInit,
        AfterContentChecked,
        AfterViewInit,
        AfterViewChecked {
  void ngOnChanges(Map<String, SimpleChange> changes) {}
  void ngOnInit() {}
  void ngDoCheck() {}
  void ngOnDestroy() {}
  void ngAfterContentInit() {}
  void ngAfterContentChecked() {}
  void ngAfterViewInit() {}
  void ngAfterViewChecked() {}
}

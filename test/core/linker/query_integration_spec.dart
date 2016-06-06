library angular2.test.core.linker.query_integration_spec;

import "package:angular2/testing_internal.dart"
    show
        AsyncTestCompleter,
        beforeEach,
        ddescribe,
        describe,
        el,
        expect,
        iit,
        inject,
        it,
        xit,
        TestComponentBuilder;
import "package:angular2/src/facade/lang.dart" show isPresent;
import "package:angular2/src/facade/async.dart" show ObservableWrapper;
import "package:angular2/core.dart"
    show
        Component,
        Directive,
        Injectable,
        Optional,
        TemplateRef,
        Query,
        QueryList,
        ViewQuery,
        ContentChildren,
        ViewChildren,
        ContentChild,
        ViewChild,
        AfterContentInit,
        AfterViewInit,
        AfterContentChecked,
        AfterViewChecked;
import "package:angular2/common.dart" show NgIf, NgFor;
import "package:angular2/core.dart" show asNativeElements, ViewContainerRef;

main() {
  describe("Query API", () {
    describe("querying by directive type", () {
      it(
          "should contain all direct child directives in the light dom (constructor)",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<div text=\"1\"></div>" +
                "<needs-query text=\"2\"><div text=\"3\">" +
                "<div text=\"too-deep\"></div>" +
                "</div></needs-query>" +
                "<div text=\"4\"></div>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              expect(asNativeElements(view.debugElement.children))
                  .toHaveText("2|3|");
              async.done();
            });
          }));
      it(
          "should contain all direct child directives in the content dom",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-content-children #q><div text=\"foo\"></div></needs-content-children>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              var q = view.debugElement.children[0].getLocal("q");
              view.detectChanges();
              expect(q.textDirChildren.length).toEqual(1);
              expect(q.numberOfChildrenAfterContentInit).toEqual(1);
              async.done();
            });
          }));
      it(
          "should contain the first content child",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-content-child #q><div *ngIf=\"shouldShow\" text=\"foo\"></div></needs-content-child>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.debugElement.componentInstance.shouldShow = true;
              view.detectChanges();
              NeedsContentChild q = view.debugElement.children[0].getLocal("q");
              expect(q.log).toEqual([
                ["setter", "foo"],
                ["init", "foo"],
                ["check", "foo"]
              ]);
              view.debugElement.componentInstance.shouldShow = false;
              view.detectChanges();
              expect(q.log).toEqual([
                ["setter", "foo"],
                ["init", "foo"],
                ["check", "foo"],
                ["setter", null],
                ["check", null]
              ]);
              async.done();
            });
          }));
      it(
          "should contain the first view child",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<needs-view-child #q></needs-view-child>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              NeedsViewChild q = view.debugElement.children[0].getLocal("q");
              expect(q.log).toEqual([
                ["setter", "foo"],
                ["init", "foo"],
                ["check", "foo"]
              ]);
              q.shouldShow = false;
              view.detectChanges();
              expect(q.log).toEqual([
                ["setter", "foo"],
                ["init", "foo"],
                ["check", "foo"],
                ["setter", null],
                ["check", null]
              ]);
              async.done();
            });
          }));
      it(
          "should set static view and content children already after the constructor call",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-static-content-view-child #q><div text=\"contentFoo\"></div></needs-static-content-view-child>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              NeedsStaticContentAndViewChild q =
                  view.debugElement.children[0].getLocal("q");
              expect(q.contentChild.text).toBeFalsy();
              expect(q.viewChild.text).toBeFalsy();
              view.detectChanges();
              expect(q.contentChild.text).toEqual("contentFoo");
              expect(q.viewChild.text).toEqual("viewFoo");
              async.done();
            });
          }));
      it(
          "should contain the first view child accross embedded views",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<needs-view-child #q></needs-view-child>";
            tcb
                .overrideTemplate(MyComp, template)
                .overrideTemplate(NeedsViewChild,
                    "<div *ngIf=\"true\"><div *ngIf=\"shouldShow\" text=\"foo\"></div></div><div *ngIf=\"shouldShow2\" text=\"bar\"></div>")
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              NeedsViewChild q = view.debugElement.children[0].getLocal("q");
              expect(q.log).toEqual([
                ["setter", "foo"],
                ["init", "foo"],
                ["check", "foo"]
              ]);
              q.shouldShow = false;
              q.shouldShow2 = true;
              q.log = [];
              view.detectChanges();
              expect(q.log).toEqual([
                ["setter", "bar"],
                ["check", "bar"]
              ]);
              q.shouldShow = false;
              q.shouldShow2 = false;
              q.log = [];
              view.detectChanges();
              expect(q.log).toEqual([
                ["setter", null],
                ["check", null]
              ]);
              async.done();
            });
          }));
      it(
          "should contain all directives in the light dom when descendants flag is used",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<div text=\"1\"></div>" +
                "<needs-query-desc text=\"2\"><div text=\"3\">" +
                "<div text=\"4\"></div>" +
                "</div></needs-query-desc>" +
                "<div text=\"5\"></div>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              expect(asNativeElements(view.debugElement.children))
                  .toHaveText("2|3|4|");
              async.done();
            });
          }));
      it(
          "should contain all directives in the light dom",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<div text=\"1\"></div>" +
                "<needs-query text=\"2\"><div text=\"3\"></div></needs-query>" +
                "<div text=\"4\"></div>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              expect(asNativeElements(view.debugElement.children))
                  .toHaveText("2|3|");
              async.done();
            });
          }));
      it(
          "should reflect dynamically inserted directives",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<div text=\"1\"></div>" +
                "<needs-query text=\"2\"><div *ngIf=\"shouldShow\" [text]=\"'3'\"></div></needs-query>" +
                "<div text=\"4\"></div>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              expect(asNativeElements(view.debugElement.children))
                  .toHaveText("2|");
              view.debugElement.componentInstance.shouldShow = true;
              view.detectChanges();
              expect(asNativeElements(view.debugElement.children))
                  .toHaveText("2|3|");
              async.done();
            });
          }));
      it(
          "should be cleanly destroyed when a query crosses view boundaries",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<div text=\"1\"></div>" +
                "<needs-query text=\"2\"><div *ngIf=\"shouldShow\" [text]=\"'3'\"></div></needs-query>" +
                "<div text=\"4\"></div>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((fixture) {
              fixture.debugElement.componentInstance.shouldShow = true;
              fixture.detectChanges();
              fixture.destroy();
              async.done();
            });
          }));
      it(
          "should reflect moved directives",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<div text=\"1\"></div>" +
                "<needs-query text=\"2\"><div *ngFor=\"var i of list\" [text]=\"i\"></div></needs-query>" +
                "<div text=\"4\"></div>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              expect(asNativeElements(view.debugElement.children))
                  .toHaveText("2|1d|2d|3d|");
              view.debugElement.componentInstance.list = ["3d", "2d"];
              view.detectChanges();
              expect(asNativeElements(view.debugElement.children))
                  .toHaveText("2|3d|2d|");
              async.done();
            });
          }));
    });
    describe("query for TemplateRef", () {
      it(
          "should find TemplateRefs in the light and shadow dom",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-tpl><template var-x=\"light\"></template></needs-tpl>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              NeedsTpl needsTpl =
                  view.debugElement.children[0].inject(NeedsTpl);
              expect(needsTpl.vc
                      .createEmbeddedView(needsTpl.query.first)
                      .hasLocal("light"))
                  .toBe(true);
              expect(needsTpl.vc
                      .createEmbeddedView(needsTpl.viewQuery.first)
                      .hasLocal("shadow"))
                  .toBe(true);
              async.done();
            });
          }));
    });
    describe("read a different token", () {
      it(
          "should contain all content children",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-content-children-read #q text=\"ca\"><div #q text=\"cb\"></div></needs-content-children-read>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              NeedsContentChildrenWithRead comp = view.debugElement.children[0]
                  .inject(NeedsContentChildrenWithRead);
              expect(comp.textDirChildren
                      .map((textDirective) => textDirective.text))
                  .toEqual(["ca", "cb"]);
              async.done();
            });
          }));
      it(
          "should contain the first content child",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-content-child-read><div #q text=\"ca\"></div></needs-content-child-read>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              NeedsContentChildWithRead comp = view.debugElement.children[0]
                  .inject(NeedsContentChildWithRead);
              expect(comp.textDirChild.text).toEqual("ca");
              async.done();
            });
          }));
      it(
          "should contain the first view child",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<needs-view-child-read></needs-view-child-read>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              NeedsViewChildWithRead comp =
                  view.debugElement.children[0].inject(NeedsViewChildWithRead);
              expect(comp.textDirChild.text).toEqual("va");
              async.done();
            });
          }));
      it(
          "should contain all child directives in the view",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-view-children-read></needs-view-children-read>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              NeedsViewChildrenWithRead comp = view.debugElement.children[0]
                  .inject(NeedsViewChildrenWithRead);
              expect(comp.textDirChildren
                      .map((textDirective) => textDirective.text))
                  .toEqual(["va", "vb"]);
              async.done();
            });
          }));
      it(
          "should support reading a ViewContainer",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-viewcontainer-read><template>hello</template></needs-viewcontainer-read>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              NeedsViewContainerWithRead comp = view.debugElement.children[0]
                  .inject(NeedsViewContainerWithRead);
              comp.createView();
              expect(view.debugElement.children[0].nativeElement)
                  .toHaveText("hello");
              async.done();
            });
          }));
    });
    describe("changes", () {
      it(
          "should notify query on change",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<needs-query #q>" +
                "<div text=\"1\"></div>" +
                "<div *ngIf=\"shouldShow\" text=\"2\"></div>" +
                "</needs-query>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              var q = view.debugElement.children[0].getLocal("q");
              view.detectChanges();
              ObservableWrapper.subscribe(q.query.changes, (_) {
                expect(q.query.first.text).toEqual("1");
                expect(q.query.last.text).toEqual("2");
                async.done();
              });
              view.debugElement.componentInstance.shouldShow = true;
              view.detectChanges();
            });
          }));
      it(
          "should notify child's query before notifying parent's query",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<needs-query-desc #q1>" +
                "<needs-query-desc #q2>" +
                "<div text=\"1\"></div>" +
                "</needs-query-desc>" +
                "</needs-query-desc>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              var q1 = view.debugElement.children[0].getLocal("q1");
              var q2 = view.debugElement.children[0].getLocal("q2");
              var firedQ2 = false;
              ObservableWrapper.subscribe(q2.query.changes, (_) {
                firedQ2 = true;
              });
              ObservableWrapper.subscribe(q1.query.changes, (_) {
                expect(firedQ2).toBe(true);
                async.done();
              });
              view.detectChanges();
            });
          }));
      it(
          "should correctly clean-up when destroyed together with the directives it is querying",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-query #q *ngIf=\"shouldShow\"><div text=\"foo\"></div></needs-query>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.debugElement.componentInstance.shouldShow = true;
              view.detectChanges();
              NeedsQuery q = view.debugElement.children[0].getLocal("q");
              expect(q.query.length).toEqual(1);
              view.debugElement.componentInstance.shouldShow = false;
              view.detectChanges();
              view.debugElement.componentInstance.shouldShow = true;
              view.detectChanges();
              NeedsQuery q2 = view.debugElement.children[0].getLocal("q");
              expect(q2.query.length).toEqual(1);
              async.done();
            });
          }));
    });
    describe("querying by var binding", () {
      it(
          "should contain all the child directives in the light dom with the given var binding",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<needs-query-by-var-binding #q>" +
                "<div *ngFor=\"#item of list\" [text]=\"item\" #textLabel=\"textDir\"></div>" +
                "</needs-query-by-var-binding>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              var q = view.debugElement.children[0].getLocal("q");
              view.debugElement.componentInstance.list = ["1d", "2d"];
              view.detectChanges();
              expect(q.query.first.text).toEqual("1d");
              expect(q.query.last.text).toEqual("2d");
              async.done();
            });
          }));
      it(
          "should support querying by multiple var bindings",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<needs-query-by-var-bindings #q>" +
                "<div text=\"one\" #textLabel1=\"textDir\"></div>" +
                "<div text=\"two\" #textLabel2=\"textDir\"></div>" +
                "</needs-query-by-var-bindings>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              var q = view.debugElement.children[0].getLocal("q");
              view.detectChanges();
              expect(q.query.first.text).toEqual("one");
              expect(q.query.last.text).toEqual("two");
              async.done();
            });
          }));
      it(
          "should support dynamically inserted directives",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<needs-query-by-var-binding #q>" +
                "<div *ngFor=\"#item of list\" [text]=\"item\" #textLabel=\"textDir\"></div>" +
                "</needs-query-by-var-binding>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              var q = view.debugElement.children[0].getLocal("q");
              view.debugElement.componentInstance.list = ["1d", "2d"];
              view.detectChanges();
              view.debugElement.componentInstance.list = ["2d", "1d"];
              view.detectChanges();
              expect(q.query.last.text).toEqual("1d");
              async.done();
            });
          }));
      it(
          "should contain all the elements in the light dom with the given var binding",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<needs-query-by-var-binding #q>" +
                "<div template=\"ngFor: #item of list\">" +
                "<div #textLabel>{{item}}</div>" +
                "</div>" +
                "</needs-query-by-var-binding>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              var q = view.debugElement.children[0].getLocal("q");
              view.debugElement.componentInstance.list = ["1d", "2d"];
              view.detectChanges();
              expect(q.query.first.nativeElement).toHaveText("1d");
              expect(q.query.last.nativeElement).toHaveText("2d");
              async.done();
            });
          }));
      it(
          "should contain all the elements in the light dom even if they get projected",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<needs-query-and-project #q>" +
                "<div text=\"hello\"></div><div text=\"world\"></div>" +
                "</needs-query-and-project>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              expect(asNativeElements(view.debugElement.children))
                  .toHaveText("hello|world|");
              async.done();
            });
          }));
      it(
          "should support querying the view by using a view query",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-view-query-by-var-binding #q></needs-view-query-by-var-binding>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              NeedsViewQueryByLabel q =
                  view.debugElement.children[0].getLocal("q");
              view.detectChanges();
              expect(q.query.first.nativeElement).toHaveText("text");
              async.done();
            });
          }));
      it(
          "should contain all child directives in the view dom",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<needs-view-children #q></needs-view-children>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              var q = view.debugElement.children[0].getLocal("q");
              view.detectChanges();
              expect(q.textDirChildren.length).toEqual(1);
              expect(q.numberOfChildrenAfterViewInit).toEqual(1);
              async.done();
            });
          }));
    });
    describe("querying in the view", () {
      it(
          "should contain all the elements in the view with that have the given directive",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-view-query #q><div text=\"ignoreme\"></div></needs-view-query>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              NeedsViewQuery q = view.debugElement.children[0].getLocal("q");
              view.detectChanges();
              expect(q.query.map((TextDirective d) => d.text))
                  .toEqual(["1", "2", "3", "4"]);
              async.done();
            });
          }));
      it(
          "should not include directive present on the host element",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-view-query #q text=\"self\"></needs-view-query>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              NeedsViewQuery q = view.debugElement.children[0].getLocal("q");
              view.detectChanges();
              expect(q.query.map((TextDirective d) => d.text))
                  .toEqual(["1", "2", "3", "4"]);
              async.done();
            });
          }));
      it(
          "should reflect changes in the component",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template = "<needs-view-query-if #q></needs-view-query-if>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              NeedsViewQueryIf q = view.debugElement.children[0].getLocal("q");
              view.detectChanges();
              expect(q.query.length).toBe(0);
              q.show = true;
              view.detectChanges();
              expect(q.query.length).toBe(1);
              expect(q.query.first.text).toEqual("1");
              async.done();
            });
          }));
      it(
          "should not be affected by other changes in the component",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-view-query-nested-if #q></needs-view-query-nested-if>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              NeedsViewQueryNestedIf q =
                  view.debugElement.children[0].getLocal("q");
              view.detectChanges();
              expect(q.query.length).toEqual(1);
              expect(q.query.first.text).toEqual("1");
              q.show = false;
              view.detectChanges();
              expect(q.query.length).toEqual(1);
              expect(q.query.first.text).toEqual("1");
              async.done();
            });
          }));
      it(
          "should maintain directives in pre-order depth-first DOM order after dynamic insertion",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-view-query-order #q></needs-view-query-order>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              NeedsViewQueryOrder q =
                  view.debugElement.children[0].getLocal("q");
              view.detectChanges();
              expect(q.query.map((TextDirective d) => d.text))
                  .toEqual(["1", "2", "3", "4"]);
              q.list = ["-3", "2"];
              view.detectChanges();
              expect(q.query.map((TextDirective d) => d.text))
                  .toEqual(["1", "-3", "2", "4"]);
              async.done();
            });
          }));
      it(
          "should maintain directives in pre-order depth-first DOM order after dynamic insertion",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-view-query-order-with-p #q></needs-view-query-order-with-p>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              NeedsViewQueryOrderWithParent q =
                  view.debugElement.children[0].getLocal("q");
              view.detectChanges();
              expect(q.query.map((TextDirective d) => d.text))
                  .toEqual(["1", "2", "3", "4"]);
              q.list = ["-3", "2"];
              view.detectChanges();
              expect(q.query.map((TextDirective d) => d.text))
                  .toEqual(["1", "-3", "2", "4"]);
              async.done();
            });
          }));
      it(
          "should handle long ngFor cycles",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-view-query-order #q></needs-view-query-order>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              NeedsViewQueryOrder q =
                  view.debugElement.children[0].getLocal("q");
              // no significance to 50, just a reasonably large cycle.
              for (var i = 0; i < 50; i++) {
                var newString = i.toString();
                q.list = [newString];
                view.detectChanges();
                expect(q.query.map((TextDirective d) => d.text))
                    .toEqual(["1", newString, "4"]);
              }
              async.done();
            });
          }));
      it(
          "should support more than three queries",
          inject([TestComponentBuilder, AsyncTestCompleter],
              (TestComponentBuilder tcb, async) {
            var template =
                "<needs-four-queries #q><div text=\"1\"></div></needs-four-queries>";
            tcb
                .overrideTemplate(MyComp, template)
                .createAsync(MyComp)
                .then((view) {
              view.detectChanges();
              var q = view.debugElement.children[0].getLocal("q");
              expect(q.query1).toBeDefined();
              expect(q.query2).toBeDefined();
              expect(q.query3).toBeDefined();
              expect(q.query4).toBeDefined();
              async.done();
            });
          }));
    });
  });
}

@Directive(selector: "[text]", inputs: const ["text"], exportAs: "textDir")
@Injectable()
class TextDirective {
  String text;
  TextDirective() {}
}

@Component(selector: "needs-content-children", template: "")
class NeedsContentChildren implements AfterContentInit {
  @ContentChildren(TextDirective)
  QueryList<TextDirective> textDirChildren;
  num numberOfChildrenAfterContentInit;
  ngAfterContentInit() {
    this.numberOfChildrenAfterContentInit = this.textDirChildren.length;
  }
}

@Component(
    selector: "needs-view-children",
    template: "<div text></div>",
    directives: const [TextDirective])
class NeedsViewChildren implements AfterViewInit {
  @ViewChildren(TextDirective)
  QueryList<TextDirective> textDirChildren;
  num numberOfChildrenAfterViewInit;
  ngAfterViewInit() {
    this.numberOfChildrenAfterViewInit = this.textDirChildren.length;
  }
}

@Component(selector: "needs-content-child", template: "")
class NeedsContentChild implements AfterContentInit, AfterContentChecked {
  TextDirective _child;
  @ContentChild(TextDirective)
  set child(value) {
    this._child = value;
    this.log.add(["setter", isPresent(value) ? value.text : null]);
  }

  get child {
    return this._child;
  }

  var log = [];
  ngAfterContentInit() {
    this.log.add(["init", isPresent(this.child) ? this.child.text : null]);
  }

  ngAfterContentChecked() {
    this.log.add(["check", isPresent(this.child) ? this.child.text : null]);
  }
}

@Component(
    selector: "needs-view-child",
    template: '''
    <div *ngIf="shouldShow" text="foo"></div>
  ''',
    directives: const [NgIf, TextDirective])
class NeedsViewChild implements AfterViewInit, AfterViewChecked {
  bool shouldShow = true;
  bool shouldShow2 = false;
  TextDirective _child;
  @ViewChild(TextDirective)
  set child(value) {
    this._child = value;
    this.log.add(["setter", isPresent(value) ? value.text : null]);
  }

  get child {
    return this._child;
  }

  var log = [];
  ngAfterViewInit() {
    this.log.add(["init", isPresent(this.child) ? this.child.text : null]);
  }

  ngAfterViewChecked() {
    this.log.add(["check", isPresent(this.child) ? this.child.text : null]);
  }
}

@Component(
    selector: "needs-static-content-view-child",
    template: '''
    <div text="viewFoo"></div>
  ''',
    directives: const [TextDirective])
class NeedsStaticContentAndViewChild {
  @ContentChild(TextDirective)
  TextDirective contentChild;
  @ViewChild(TextDirective)
  TextDirective viewChild;
}

@Directive(selector: "[dir]")
@Injectable()
class InertDirective {
  InertDirective() {}
}

@Component(
    selector: "needs-query",
    directives: const [NgFor, TextDirective],
    template:
        "<div text=\"ignoreme\"></div><b *ngFor=\"var dir of query\">{{dir.text}}|</b>")
@Injectable()
class NeedsQuery {
  QueryList<TextDirective> query;
  NeedsQuery(@Query(TextDirective) QueryList<TextDirective> query) {
    this.query = query;
  }
}

@Component(selector: "needs-four-queries", template: "")
class NeedsFourQueries {
  @ContentChild(TextDirective)
  TextDirective query1;
  @ContentChild(TextDirective)
  TextDirective query2;
  @ContentChild(TextDirective)
  TextDirective query3;
  @ContentChild(TextDirective)
  TextDirective query4;
}

@Component(
    selector: "needs-query-desc",
    directives: const [NgFor],
    template: "<div *ngFor=\"var dir of query\">{{dir.text}}|</div>")
@Injectable()
class NeedsQueryDesc {
  QueryList<TextDirective> query;
  NeedsQueryDesc(
      @Query(TextDirective, descendants: true) QueryList<TextDirective> query) {
    this.query = query;
  }
}

@Component(
    selector: "needs-query-by-var-binding",
    directives: const [],
    template: "<ng-content>")
@Injectable()
class NeedsQueryByLabel {
  QueryList<dynamic> query;
  NeedsQueryByLabel(
      @Query("textLabel", descendants: true) QueryList<dynamic> query) {
    this.query = query;
  }
}

@Component(
    selector: "needs-view-query-by-var-binding",
    directives: const [],
    template: "<div #textLabel>text</div>")
@Injectable()
class NeedsViewQueryByLabel {
  QueryList<dynamic> query;
  NeedsViewQueryByLabel(@ViewQuery("textLabel") QueryList<dynamic> query) {
    this.query = query;
  }
}

@Component(
    selector: "needs-query-by-var-bindings",
    directives: const [],
    template: "<ng-content>")
@Injectable()
class NeedsQueryByTwoLabels {
  QueryList<dynamic> query;
  NeedsQueryByTwoLabels(
      @Query("textLabel1,textLabel2", descendants: true)
          QueryList<dynamic> query) {
    this.query = query;
  }
}

@Component(
    selector: "needs-query-and-project",
    directives: const [NgFor],
    template:
        "<div *ngFor=\"var dir of query\">{{dir.text}}|</div><ng-content></ng-content>")
@Injectable()
class NeedsQueryAndProject {
  QueryList<TextDirective> query;
  NeedsQueryAndProject(@Query(TextDirective) QueryList<TextDirective> query) {
    this.query = query;
  }
}

@Component(
    selector: "needs-view-query",
    directives: const [TextDirective],
    template: "<div text=\"1\"><div text=\"2\"></div></div>" +
        "<div text=\"3\"></div><div text=\"4\"></div>")
@Injectable()
class NeedsViewQuery {
  QueryList<TextDirective> query;
  NeedsViewQuery(@ViewQuery(TextDirective) QueryList<TextDirective> query) {
    this.query = query;
  }
}

@Component(
    selector: "needs-view-query-if",
    directives: const [NgIf, TextDirective],
    template: "<div *ngIf=\"show\" text=\"1\"></div>")
@Injectable()
class NeedsViewQueryIf {
  bool show;
  QueryList<TextDirective> query;
  NeedsViewQueryIf(@ViewQuery(TextDirective) QueryList<TextDirective> query) {
    this.query = query;
    this.show = false;
  }
}

@Component(
    selector: "needs-view-query-nested-if",
    directives: const [NgIf, InertDirective, TextDirective],
    template: "<div text=\"1\"><div *ngIf=\"show\"><div dir></div></div></div>")
@Injectable()
class NeedsViewQueryNestedIf {
  bool show;
  QueryList<TextDirective> query;
  NeedsViewQueryNestedIf(
      @ViewQuery(TextDirective) QueryList<TextDirective> query) {
    this.query = query;
    this.show = true;
  }
}

@Component(
    selector: "needs-view-query-order",
    directives: const [NgFor, TextDirective, InertDirective],
    template: "<div text=\"1\"></div>" +
        "<div *ngFor=\"var i of list\" [text]=\"i\"></div>" +
        "<div text=\"4\"></div>")
@Injectable()
class NeedsViewQueryOrder {
  QueryList<TextDirective> query;
  List<String> list;
  NeedsViewQueryOrder(
      @ViewQuery(TextDirective) QueryList<TextDirective> query) {
    this.query = query;
    this.list = ["2", "3"];
  }
}

@Component(
    selector: "needs-view-query-order-with-p",
    directives: const [NgFor, TextDirective, InertDirective],
    template: "<div dir><div text=\"1\"></div>" +
        "<div *ngFor=\"var i of list\" [text]=\"i\"></div>" +
        "<div text=\"4\"></div></div>")
@Injectable()
class NeedsViewQueryOrderWithParent {
  QueryList<TextDirective> query;
  List<String> list;
  NeedsViewQueryOrderWithParent(
      @ViewQuery(TextDirective) QueryList<TextDirective> query) {
    this.query = query;
    this.list = ["2", "3"];
  }
}

@Component(
    selector: "needs-tpl", template: "<template var-x=\"shadow\"></template>")
class NeedsTpl {
  ViewContainerRef vc;
  QueryList<TemplateRef> viewQuery;
  QueryList<TemplateRef> query;
  NeedsTpl(@ViewQuery(TemplateRef) QueryList<TemplateRef> viewQuery,
      @Query(TemplateRef) QueryList<TemplateRef> query, this.vc) {
    this.viewQuery = viewQuery;
    this.query = query;
  }
}

@Component(selector: "needs-content-children-read", template: "")
class NeedsContentChildrenWithRead {
  @ContentChildren("q", read: TextDirective)
  QueryList<TextDirective> textDirChildren;
  @ContentChildren("nonExisting", read: TextDirective)
  QueryList<TextDirective> nonExistingVar;
}

@Component(selector: "needs-content-child-read", template: "")
class NeedsContentChildWithRead {
  @ContentChild("q", read: TextDirective)
  TextDirective textDirChild;
  @ContentChild("nonExisting", read: TextDirective)
  TextDirective nonExistingVar;
}

@Component(
    selector: "needs-view-children-read",
    template: "<div #q text=\"va\"></div><div #q text=\"vb\"></div>",
    directives: const [TextDirective])
class NeedsViewChildrenWithRead {
  @ViewChildren("q", read: TextDirective)
  QueryList<TextDirective> textDirChildren;
  @ViewChildren("nonExisting", read: TextDirective)
  QueryList<TextDirective> nonExistingVar;
}

@Component(
    selector: "needs-view-child-read",
    template: "<div #q text=\"va\"></div>",
    directives: const [TextDirective])
class NeedsViewChildWithRead {
  @ViewChild("q", read: TextDirective)
  TextDirective textDirChild;
  @ViewChild("nonExisting", read: TextDirective)
  TextDirective nonExistingVar;
}

@Component(selector: "needs-viewcontainer-read", template: "<div #q></div>")
class NeedsViewContainerWithRead {
  @ViewChild("q", read: ViewContainerRef)
  ViewContainerRef vc;
  @ViewChild("nonExisting", read: ViewContainerRef)
  ViewContainerRef nonExistingVar;
  @ContentChild(TemplateRef)
  TemplateRef template;
  createView() {
    this.vc.createEmbeddedView(this.template);
  }
}

@Component(
    selector: "my-comp",
    directives: const [
      NeedsQuery,
      NeedsQueryDesc,
      NeedsQueryByLabel,
      NeedsQueryByTwoLabels,
      NeedsQueryAndProject,
      NeedsViewQuery,
      NeedsViewQueryIf,
      NeedsViewQueryNestedIf,
      NeedsViewQueryOrder,
      NeedsViewQueryByLabel,
      NeedsViewQueryOrderWithParent,
      NeedsContentChildren,
      NeedsViewChildren,
      NeedsViewChild,
      NeedsStaticContentAndViewChild,
      NeedsContentChild,
      NeedsTpl,
      TextDirective,
      InertDirective,
      NgIf,
      NgFor,
      NeedsFourQueries,
      NeedsContentChildrenWithRead,
      NeedsContentChildWithRead,
      NeedsViewChildrenWithRead,
      NeedsViewChildWithRead,
      NeedsViewContainerWithRead
    ],
    template: "")
@Injectable()
class MyComp {
  bool shouldShow;
  var list;
  MyComp() {
    this.shouldShow = false;
    this.list = ["1d", "2d", "3d"];
  }
}

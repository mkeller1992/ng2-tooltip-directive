# Tooltip for Angular

**IMPORTANT**: There are **breaking changes** in the setup and the usage of this library. Please read the instructions below.

This library offers three different tooltip directives (string, html and template) and draws inspiration from the no longer maintained ng2-tooltip-directive.

The latest library version is compatible with **Angular 17**.

Tooltips are informative pop-up tips that appear when you hover over or click on an item, providing helpful additional information or guidance.

---

## Demo
https://mkeller1992.github.io/ngx-tooltip-directives/

---

## Install

To install the library, enter the following command in your console:
```
npm i ng2-tooltip-directive-ngfix
```

## Setup
### For apps based on `Standalone Components`
Import the directives for the respective tooltips directly in your component:
```ts
import { TooltipHtmlDirective, TooltipStrDirective, TooltipTemplateDirective } from 'ng2-tooltip-directive-ngfix';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: true,
    imports: [TooltipStrDirective, TooltipHtmlDirective, TooltipTemplateDirective]
})
```


### For apps based on `ngModule`
Make sure you import `TooltipModule` into your `@NgModule`:
```ts
import { TooltipModule } from 'ng2-tooltip-directive-ngfix';
 
@NgModule({
    imports: [ TooltipModule ]
}) 
```

## Usage
There are three ways of creating a tooltip:
    
### Pass the tooltip text as a string via `tooltipStr`:

```html
<div tooltipStr="Tooltip text">Show Tooltip</div>
```

### Pass the tooltip content as SafeHtml via `tooltipHtml`:

```html
<div [tooltipHtml]="safeTooltipHtml" placement="right">Show Html Tooltip</div>
```
```ts
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
// Code skipped for brevity

export class AppComponent {
  rawHtml: string = '<div><p>This is a <strong>tooltip</strong> with HTML</p></div>';
  safeTooltipHtml: SafeHtml;

  constructor(private sanitizer: DomSanitizer){ 
    this.safeTooltipHtml = this.sanitizer.bypassSecurityTrustHtml(this.rawHtml);
  }
}
```

### Pass the tooltip content as template via `tooltipTemplate`:

```html
<ng-template #myTemplate>
  <div style="color: blue; font-weight: bold;">
    Tooltip Template
  </div>
</ng-template>

<div [tooltipTemplate]="myTemplate" placement="right">Show Tooltip Template</div>

```
---

## Trigger tooltip programmatically
```html
<div tooltip [tooltipStr]="'Tooltip text'" #myTooltip="tooltipStr"></div>

<button class="btn btn-small btn-outline btn-rounded" (click)="show()">show() via component.ts</button>
<button class="btn btn-small btn-outline btn-rounded" (click)="hide()">hide() via component.ts</button>
```
```ts
@ViewChild('myTooltip')
tooltip!: TooltipStrDirective;

show() {
  this.tooltip.show();
}

hide() {
  this.tooltip.hide();
}
```

---

## 3 ways of setting tooltip options

1 - Options can be set via html-attributes, so they have the highest priority:

```html
<div tooltipStr="Tooltip on the right" textAlign="left" placement="right">Show Tooltip</div>
```

2 - Options can be passed to the tooltips as TooltipOptions object:

```html
<div tooltipStr="Tooltip on the right" [options]="myOptions">Show Tooltip</div>
```
```ts
myOptions: TooltipOptions = {
    'placement': 'right',
    'showDelay': 500
}
```


3 - Options can be set globally when importing the module:

For apps based on `Standalone Components`:

```ts
import { TooltipModule, TooltipOptions } from 'ng2-tooltip-directive-ngfix';

const myDefaultTooltipOptions: TooltipOptions = {
  'backgroundColor': 'yellow'
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
			TooltipModule.forRoot(myDefaultTooltipOptions)
		)
  ]
}).catch(err => console.error(err));
```
For apps based on `ngModule's`:

```ts
import { TooltipModule, TooltipOptions } from 'ng2-tooltip-directive-ngfix';

const myDefaultTooltipOptions: TooltipOptions = {
  'backgroundColor': 'yellow'
}

@NgModule({
    imports: [ 
      TooltipModule.forRoot(myDefaultTooltipOptions)
    ]
})
```

---

## Properties

| name                  | type                                  | default | description |
|-----------------------|---------------------------------------|---------|-------------|
| id                    | string \| number                      | 0       | A custom id that can be assigned to the tooltip. |
| placement             | Placement                             | 'top'   | The position of the tooltip. |
| autoPlacement         | boolean                               | true    | If true, the tooltip will be placed so that it does not go beyond the borders of the browser window. |
| contentType           | ContentType                           | 'string'| The type of content passed to the tooltip. |
| textColor             | string                                | 'black' | The color of the tooltip text. |
| backgroundColor       | string                                | 'white' | The background color of the tooltip. |
| borderColor           | string                                | 'blue'  | The border color of the tooltip. |
| textAlign             | "left" \| "center" \| "right"         | 'center'| The horizontal alignment of the tooltip text. |
| padding               | string                                | '10px 13px 10px 13px' | The padding around the tooltip text (top, right, bottom, left). |
| shadow                | boolean                               | true    | If true, the tooltip will have a shadow. |
| showDelay             | number                                | 0       | The delay in ms before the tooltip is shown. |
| hideDelay             | number                                | 0       | The delay in ms before the tooltip is removed. |
| hideDelayTouchscreen  | number                                | 0       | The delay in ms before the tooltip is hidden on mobile devices. |
| zIndex                | number                                | 0       | The z-index of the tooltip. |
| animationDuration     | number                                | 100     | The duration in ms that the animation takes to run from start to finish. |
| trigger               | "hover" \| "click"                    | 'hover' | Specifies how the tooltip is triggered. The closing time is controlled with "hide-delay". |
| tooltipClass          | string                                | ''      | Any additional classes to be passed to the tooltip (target them with `::ng-deep`). |
| display               | boolean                               | true    | If true, the tooltip is available for display. |
| displayTouchscreen    | boolean                               | true    | If true, the tooltip will be displayed on mobile devices. |
| offset                | number                                | 8       | The offset of the tooltip relative to the item. |
| maxWidth              | string                                | '200px' | The maximum width of the tooltip. |
| hideDelayAfterClick   | number                                | undefined | The delay in ms before hiding the tooltip when the "click" trigger is used. |
| pointerEvents         | "auto" \| "none"                      | 'auto'  | Defines whether or not the tooltip reacts to pointer events. |
| position              | {top: number, left: number}           | undefined | The coordinates of the tooltip relative to the browser window. |  
   
---

## Events

Events are called in accordance with the delays specified in the options within the directive. By default, there is a 300-millisecond delay before the tooltip hides.

| Event            | Description                                                                                 |
|------------------|---------------------------------------------------------------------------------------------|
| {type: "show", position: DOMRect} | This event is fired prior to the tooltip's appearance. |
| {type: "shown", position: DOMRect} | This event is fired following the tooltip's appearance animation. |
| {type: "hide", position: DOMRect} | This event is fired prior to the tooltip being hidden. |
| {type: "hidden", position: DOMRect} | This event is fired after the tooltip hiding animation completes. |  

---

## Methods

If you have defined the directive options, these will be taken into consideration when calling the methods. This includes the delay before the tooltip appears and before it hides.

| Method           | Description                                                                                 |
|------------------|---------------------------------------------------------------------------------------------|
| show()           | Displays the tooltip. |
| hide()           | Hides the tooltip. |

---

## Testing with NgxTooltipDirectives

To simplify unit testing of components that use `NgxTooltipDirectives`, this library provides a set of mock directives as well as a mock module. You can use these mocks to bypass the actual directive behavior in your tests, focusing on the component logic instead.

### Mocking when component under test is a standalone component
In the test initialization you might have to use `.overrideComponent` in order to override the actual directives with the mock-directives that are provided by my library.

```typescript
import { TestBed } from "@angular/core/testing";
import { DomSanitizer } from "@angular/platform-browser";
import { MockTooltipHtmlDirective, MockTooltipStrDirective, MockTooltipTemplateDirective,
         TooltipHtmlDirective, TooltipStrDirective, TooltipTemplateDirective } from "ng2-tooltip-directive-ngfix";
import { AppComponent } from "./app.component";

describe("AppComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ AppComponent ],
      providers: [
        { provide: DomSanitizer, useValue: { bypassSecurityTrustHtml: () => {} } },
      ]
    })
    .overrideComponent(AppComponent, {
      remove: {
        imports: [
          TooltipStrDirective,
          TooltipHtmlDirective,
          TooltipTemplateDirective
        ]
      },
      add: {
        imports: [
          MockTooltipStrDirective,
          MockTooltipHtmlDirective,
          MockTooltipTemplateDirective
        ]
      }
    })
    .compileComponents();
  });
  // Your tests here
});
```

### Mocking when component under test is a NgModule-based component

Import `MockTooltipModule` in your test suite's TestBed configuration:

```typescript
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { MockTooltipModule } from 'ng2-tooltip-directive-ngfix';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [MockTooltipModule]
    }).compileComponents();
  });

  // Your tests here
});
```
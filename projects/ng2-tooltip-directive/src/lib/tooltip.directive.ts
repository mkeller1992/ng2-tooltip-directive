import { ApplicationRef, Directive, ElementRef, EventEmitter, HostListener, Inject, Injector, Input, OnDestroy, Optional, Output, SimpleChanges, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { defaultOptions } from './default-options.const';
import { TooltipOptions } from './options.interface';
import { TooltipOptionsService } from './options.service';
import { TooltipComponent } from './tooltip.component';

export type ContentType = "string" | "html" | "template";

export interface AdComponent {
    data: any;
    show: boolean;
    close: boolean;
    events: any;
}

@Directive({
    selector: '[tooltip]',
    exportAs: 'tooltip',
})

export class TooltipDirective implements OnDestroy {

    hideTimeoutId!: number;
    destroyTimeoutId!: number;
    hideAfterClickTimeoutId!: number;
    createTimeoutId!: number;
    showTimeoutId!: number;
    componentRef: any;
    elementPosition: any;
    private _options: TooltipOptions = {};
    private _destroyDelay!: number;
    private _showDelay!: number;
    private _hideDelay!: number;
    private _tooltipClass!: string;
    private _animationDuration!: number;
    private _maxWidth!: string;

    private _subscriptions = new Subscription();

    @Input('id')
    id: any;

    @Input('options')
    set options(value: TooltipOptions) {
        if (value && defaultOptions) {
            this._options = value;
        }
    }
    get options(): TooltipOptions {
        return this._options;
    }

    @Input('tooltip')
    tooltipValue!: string;

    @Input('placement')
    placement!: string;

    @Input('autoPlacement')
    autoPlacement!: boolean;

    @Input('contentType')
    contentType: ContentType = 'string';

    @Input('hideDelayTouchscreen')
    hideDelayTouchscreen!: number;

    @Input('zIndex')
    zIndex!: number;

    @Input('animationDuration')
    set animationDuration(value: number) {
        if (value) {
            this._animationDuration = value;
        }
    }
    get animationDuration() {
        return this._animationDuration;
    }

    @Input('trigger')
    trigger!: string;

    @Input('tooltipClass')
    set tooltipClass(value: string) {
        if (value) {
            this._tooltipClass = value;
        }
    }
    get tooltipClass() {
        return this._tooltipClass;
    }

    @Input('display')
    display!: boolean;

    @Input('displayMobile')
    displayMobile!: boolean;

    @Input('displayTouchscreen')
    displayTouchscreen!: boolean;

    @Input('shadow')
    shadow!: boolean;

    @Input('theme')
    theme!: "dark" | "light";

    @Input('offset')
    offset!: number;

    @Input('width')
    width!: string;

    @Input('maxWidth')
    set maxWidth(value: string) {
        if (value) {
            this._maxWidth = value;
        }
    }
    get maxWidth() {
        return this._maxWidth;
    }

    @Input('showDelay')
    set showDelay(value: number) {
        if (value) {
            this._showDelay = value;
        }
    }
    get showDelay() {
        return this._showDelay;
    }
    
    @Input('hideDelay')
    set hideDelay(value: number) {
        if (value) {
            this._hideDelay = value;
        }
    }
    get hideDelay() {
        return this._hideDelay;
    }

    @Input('hideDelayAfterClick')
    hideDelayAfterClick!: number;

    @Input('pointerEvents')
    pointerEvents!: 'auto' | 'none';

    @Input('position')
    position!: {top: number, left: number};


    get isTooltipDestroyed(): boolean {        
        return !!this.componentRef?.hostView?.destroyed;
    }

    get destroyDelay(): number {
        return this._destroyDelay ?? Number(this.getHideDelay()) + Number(this.options.animationDuration);
    }

    set destroyDelay(value: number) {
        this._destroyDelay = value;
    }

    get tooltipPosition(): any {
        return this.options.position ?? this.elementPosition;
    }

    @Output()
    events: EventEmitter<any> = new EventEmitter<any>();

    constructor(
        @Optional() @Inject(TooltipOptionsService) private initOptions: TooltipOptions,
        private elementRef: ElementRef,
        private viewContainerRef: ViewContainerRef,
        private appRef: ApplicationRef,
        private injector: Injector) {}

    @HostListener('focusin')
    @HostListener('mouseenter')
    onMouseEnter() {
        if (this.isDisplayOnHover == false) {
            return;
        }

        this.show();
    }

    @HostListener('focusout')
    @HostListener('mouseleave')
    onMouseLeave() {
        if (this.options.trigger === 'hover') {
            this.destroyTooltip();
        }
    }

    @HostListener('click')
    onClick() {
        if (this.isDisplayOnClick == false) {
            return;
        }

        this.show();
        this.hideAfterClickTimeoutId = window.setTimeout(() => {
            this.destroyTooltip();
        }, this.options.hideDelayAfterClick)
    }

    ngOnChanges(changes: SimpleChanges) {
        const changedOptions = this.getProperties(changes);
        this.applyOptionsDefault(defaultOptions, changedOptions);
    }

    getShowDelay() {
        return this.options.showDelay;
    }

    getHideDelay() {
        const hideDelay = this.options.hideDelay;
        const hideDelayTouchscreen = this.options.hideDelayTouchscreen;

        return this.isTouchScreen ? hideDelayTouchscreen : hideDelay;
    }

    getProperties(changes: SimpleChanges){
        let directiveProperties: any = {};
        let customProperties: any = {};
        let allProperties: any = {};

        for (var prop in changes) {
            if (prop !== 'options' && prop !== 'tooltipValue'){
                directiveProperties[prop] = changes[prop].currentValue;
            }
            if (prop === 'options'){
                customProperties = changes[prop].currentValue;
            }
        }

        allProperties = Object.assign({}, customProperties, directiveProperties);
        return allProperties;
    }

    getElementPosition(): void {
        this.elementPosition = this.elementRef.nativeElement.getBoundingClientRect();
    }

    createTooltip(): void {
        this.clearTimeouts();
        this.getElementPosition();

        this.createTimeoutId = window.setTimeout(() => {
            this.appendComponentToBody();
        }, this.getShowDelay());

        this.showTimeoutId = window.setTimeout(() => {
            this.showTooltipElem();
        }, this.getShowDelay());
    }

    destroyTooltip(destroyInstantly = false): void {
        this.clearTimeouts();

        if (this.isTooltipDestroyed == false) {
            this.hideTimeoutId = window.setTimeout(() => {
                this.hideTooltip();
            }, destroyInstantly ? 0 : this.getHideDelay());

            this.destroyTimeoutId = window.setTimeout(() => {
                if (!this.componentRef || this.isTooltipDestroyed) {
                    return;
                }

                this.appRef.detachView(this.componentRef.hostView);
                this.componentRef.destroy();
                this.events.emit({
                    type: 'hidden', 
                    position: this.tooltipPosition
                });
            }, destroyInstantly ? 0 : this.destroyDelay);
        }
    }

    showTooltipElem(): void {
        this.clearTimeouts();
        (<AdComponent> this.componentRef.instance).show = true;
        this.events.emit({
            type: 'show',
            position: this.tooltipPosition
        });
    }

    hideTooltip(): void {
        if (!this.componentRef || this.isTooltipDestroyed) {
            return;
        }
        (<AdComponent> this.componentRef.instance).show = false;
        this.events.emit({
            type: 'hide',
            position: this.tooltipPosition
        });
    }

    appendComponentToBody(): void {
        // Create the component using the ViewContainerRef.
        // This way the component is automatically added to the change detection cycle of the Angular application
        this.componentRef = this.viewContainerRef.createComponent(TooltipComponent, { injector: this.injector });

        // Set the data property of the component instance.
        (<AdComponent>this.componentRef.instance).data = {
          value: this.tooltipValue,
          element: this.elementRef.nativeElement,
          elementPosition: this.tooltipPosition,
          options: this.options
        };
      
        // Get the DOM element from the component's view.
        const domElem = (this.componentRef.location.nativeElement as HTMLElement);
      
        // Append the DOM element to the document body.
        document.body.appendChild(domElem);
      
        // Subscribe to events from the component.
        this._subscriptions.add((<AdComponent>this.componentRef.instance).events.subscribe((event: any) => {
          this.handleEvents(event);
        }));
    }

    // Clears all timeouts that exist:
    clearTimeouts(): void {
        this.createTimeoutId && clearTimeout(this.createTimeoutId);
        this.showTimeoutId && clearTimeout(this.showTimeoutId);
        this.hideTimeoutId && clearTimeout(this.hideTimeoutId);
        this.destroyTimeoutId && clearTimeout(this.destroyTimeoutId);
    }

    get isDisplayOnHover(): boolean {
        if (this.options.display == false) {
            return false;
        }

        if (this.options.displayTouchscreen == false && this.isTouchScreen) {
            return false;
        }

        if (this.options.trigger !== 'hover') {
            return false;
        }

        return true;
    }

    get isDisplayOnClick(): boolean {
        if (this.options.display == false) {
            return false;
        }

        if (this.options.displayTouchscreen == false && this.isTouchScreen) {
            return false;
        }

        if (this.options.trigger != 'click') {
            return false;
        }

        return true;
    }

    get isTouchScreen() {
        var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
        var mq = function(query:any) {
            return window.matchMedia(query).matches;
        }

        if (('ontouchstart' in window)) {
            return true;
        }

        // include the 'heartz' as a way to have a non matching MQ to help terminate the join
        // https://git.io/vznFH
        var query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
        return mq(query);
    }

    applyOptionsDefault(defaultOptions: TooltipOptions, changedOptions: any): void {
        // Merge default, initial, current, and user-specified options, with changedOptions having the highest priority:
        this.options = Object.assign({}, defaultOptions, this.initOptions || {}, this.options, changedOptions);
    }

    handleEvents(event: any) {
        if (event.type === 'shown') {
            this.events.emit({
                type: 'shown',
                position: this.tooltipPosition
            });
        }
    }

    public show() {
        if (!this.tooltipValue) {
            return;
        }

        if (!this.componentRef || this.isTooltipDestroyed) {
            this.createTooltip();
        }
        else if (!this.isTooltipDestroyed) {
            this.showTooltipElem();
        }
    }

    public hide() {
        this.destroyTooltip();
    }

    ngOnDestroy(): void {
        this.destroyTooltip(true);
        this._subscriptions?.unsubscribe();        
    }
}

import { ApplicationRef, ComponentRef, Directive, ElementRef, EventEmitter, HostListener, Inject, Injector, Input, OnDestroy, OnInit, Optional, Output, SimpleChanges, TemplateRef, ViewContainerRef } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { concatMap, delay, filter, first, fromEvent, of, race, Subject, switchMap, takeUntil, tap, timer } from 'rxjs';
import { defaultOptions } from './default-options.const';
import { TooltipOptions } from './options.interface';
import { TooltipOptionsService } from './options.service';
import { TooltipComponent } from './tooltip.component';
import { TooltipDto } from './tooltip.dto';

export type ContentType = "string" | "html" | "template";

@Directive({
    selector: '[tooltip]',
    exportAs: 'tooltip',
})

export class TooltipDirective implements OnInit, OnDestroy {

	// A merge of all options that were passed in various ways:
	private finalOptions!: TooltipOptions;

    // Will contain all options collected from the @Inputs
	private collectedOptions: Partial<TooltipOptions> = {};

    hideTimeoutId!: number;
    destroyTimeoutId!: number;
    hideAfterClickTimeoutId!: number;
    createTimeoutId!: number;
    showTimeoutId!: number;
    
    private _showDelay!: number;
    private _hideDelay!: number;
    private _tooltipClass!: string;
    private _animationDuration!: number;
    private _maxWidth!: string;

    @Input()
    id: any;

    // Pass options as a single object:
    @Input()
	options: TooltipOptions = {};

    @Input()
    tooltipStr!: string;

    @Input()
    tooltipHtml!: SafeHtml;

    @Input()
    tooltipTemplate!: TemplateRef<any>;

    @Input()
    contentType: ContentType = 'string';

    @Input()
    placement!: string;


    @Input()
    autoPlacement!: boolean;

    @Input()
    hideDelayTouchscreen!: number;

    @Input()
    zIndex!: number;

    @Input()
    set animationDuration(value: number) {
        if (value) {
            this._animationDuration = value;
        }
    }
    get animationDuration() {
        return this._animationDuration;
    }

    @Input()
    trigger!: string;

    @Input()
    set tooltipClass(value: string) {
        if (value) {
            this._tooltipClass = value;
        }
    }
    get tooltipClass() {
        return this._tooltipClass;
    }

    @Input()
    display!: boolean;

    @Input()
    displayMobile!: boolean;

    @Input()
    displayTouchscreen!: boolean;

    @Input()
    shadow!: boolean;

    @Input()
    theme!: "dark" | "light";

    @Input()
    offset!: number;

    @Input()
    width!: string;

    @Input()
    set maxWidth(value: string) {
        if (value) {
            this._maxWidth = value;
        }
    }
    get maxWidth() {
        return this._maxWidth;
    }

    @Input()
    set showDelay(value: number) {
        if (value) {
            this._showDelay = value;
        }
    }
    get showDelay() {
        return this._showDelay;
    }
    
    @Input()
    set hideDelay(value: number) {
        if (value) {
            this._hideDelay = value;
        }
    }
    get hideDelay() {
        return this._hideDelay;
    }

    @Input()
    hideDelayAfterClick!: number;

    @Input()
    pointerEvents!: 'auto' | 'none';

    @Input()
    position!: {top: number, left: number};


    @Output()
    events: EventEmitter<any> = new EventEmitter<any>();


    private refToTooltipComponent: ComponentRef<TooltipComponent> | undefined;
	private tooltipComponent: TooltipComponent | undefined;

    private isTooltipVisible = false;

	private get isTooltipCreated(): boolean {
		return !!this.tooltipComponent;
	}

    get isTooltipComponentDestroyed(): boolean {        
		return !this.refToTooltipComponent?.location.nativeElement.isConnected;
    }

	private get destroyDelay(): number {
		return Number(this.finalOptions.hideDelay) + Number(this.finalOptions.animationDuration);
	}

    get hostElementPosition(): { top: number, left: number } | DOMRect {
        return this.finalOptions.position ?? this.hostElementRef.nativeElement.getBoundingClientRect();
    }

    get isDisplayOnHover(): boolean {
        if (this.finalOptions.display == false ||
            (this.finalOptions.displayTouchscreen == false && this.isTouchScreen) ||
            this.finalOptions.trigger !== 'hover') {
            return false;
        }
        return true;
    }

    get isDisplayOnClick(): boolean {
        if (this.finalOptions.display == false ||
            (this.finalOptions.displayTouchscreen == false && this.isTouchScreen) ||
            this.finalOptions.trigger != 'click') {
            return false;
        }
        return true;
    }

    get isTouchScreen() {
        return ('ontouchstart' in window) || window.matchMedia('(any-pointer: coarse)').matches;
    }

    private clearTimeouts$ = new Subject<void>();
	private destroy$ = new Subject<void>();


    constructor(
        @Optional() @Inject(TooltipOptionsService) private initOptions: TooltipOptions,
        private hostElementRef: ElementRef,
        private viewContainerRef: ViewContainerRef,
        private appRef: ApplicationRef,
        private injector: Injector) {}

    ngOnInit(): void {
		// On click on input-field: Hide tooltip
		this.listenToClickOnHostElement();

		// The tooltip-position needs to be adjusted when user scrolls or resizes the window:
		this.listenToScrollAndResizeEvents();

		// Update tooltip 'on submit':
		this.updateTooltipVisibilityOnSubmit();
    }


    /** Public User-Methods **/

	public show() {
		if ((this.finalOptions.contentType === 'string' && !this.tooltipStr) ||
            (this.finalOptions.contentType === 'html' && !this.tooltipHtml) ||
            (this.finalOptions.contentType === 'template' && !this.tooltipTemplate)) {
            return;
        }

		if (!this.isTooltipCreated || this.isTooltipComponentDestroyed) {
			this.createTooltip();
		}
		else if (!this.isTooltipComponentDestroyed) {
			this.showTooltip();
		}
	}

	public hide() {
		this.hideTooltip();
	}


    /** Private library-Methods **/

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
        if (this.finalOptions.trigger === 'hover') {
            this.destroyTooltip();
        }
    }

    @HostListener('click')
    onClick() {
        this.show();
        this.hideAfterClickTimeoutId = window.setTimeout(() => {
            this.destroyTooltip();
        }, this.finalOptions.hideDelayAfterClick)
    }

	private listenToClickOnHostElement() {
        if (this.isDisplayOnClick) {
            fromEvent(this.hostElementRef.nativeElement, 'click')
            .pipe(
                  filter(() => !!this.refToTooltipComponent?.hostView),
                  tap(() => this.show()),
                  // Make delay cancellable:
                  switchMap(() =>
                    race(timer(this.finalOptions.hideDelayAfterClick ?? 0), this.clearTimeouts$),
                  ),
                  tap(() => this.hide()),
                  takeUntil(this.destroy$)
              )
              .subscribe();
        }
	}

    ngOnChanges(changes: SimpleChanges) {
        const changedOptions = this.getProperties(changes);
        this.applyOptionsDefault(defaultOptions, changedOptions);
    }

    getShowDelay() {
        return this.finalOptions.showDelay;
    }

    getHideDelay() {
        const hideDelay = this.finalOptions.hideDelay;
        const hideDelayTouchscreen = this.finalOptions.hideDelayTouchscreen;

        return this.isTouchScreen ? hideDelayTouchscreen : hideDelay;
    }

	private createTooltip(): void {
		// Stop all ongoing processes:
		this.clearTimeouts$.next();

		timer(this.finalOptions.showDelay ?? 0)
			.pipe(
				first(),
		  		takeUntil(this.destroy$ || this.clearTimeouts$),
		  		tap(() => {
					this.appendComponentToBody();
					this.showTooltip();
				}),
				takeUntil(this.destroy$)
			)
			.subscribe();
	}

    appendComponentToBody(): void {
        // Create the component using the ViewContainerRef.
        // This way the component is automatically added to the change detection cycle of the Angular application
        this.refToTooltipComponent = this.viewContainerRef.createComponent(TooltipComponent, { injector: this.injector });
        this.tooltipComponent = this.refToTooltipComponent.instance;

        // Attach tooltip-click listener:
		this.listenToClicksOnTooltip(this.tooltipComponent);

		if(!this.tooltipComponent) { return; }     
      
        // Get the DOM element from the component's view.
        const domElemTooltip = (this.refToTooltipComponent.location.nativeElement as HTMLElement);
      
        // Append the DOM element to the document body.
        document.body.appendChild(domElemTooltip);
      
    	// Subscribe to events from the component.
    	this.tooltipComponent?.events
			.pipe(
				takeUntil(this.destroy$),
				filter((eventType) => eventType === 'shown'),
				tap(() => this.events.emit({ type: 'shown', position: this.hostElementPosition }))
			)
            .subscribe();
    }

	private showTooltip(): void {
		if (this.tooltipComponent) {
			// Stop all ongoing processes:
			this.clearTimeouts$.next();

            // Set the data property of the component instance
            const tooltipData = this.getTooltipData();

			this.tooltipComponent.showTooltip(tooltipData);
			this.isTooltipVisible = true;

			this.events.emit({ type: 'show', position: this.hostElementPosition });
		}
	}

	private hideTooltip(hideInstantly = false): void {
    	if (this.isTooltipVisible && !this.isTooltipComponentDestroyed) {
			this.events.emit({ type: 'hide', position: this.hostElementPosition });

			timer(hideInstantly ? 0 : this.finalOptions.hideDelay ?? 0)
				.pipe(
					first(),
					takeUntil(this.destroy$ || this.clearTimeouts$),
					tap(() => {
						this.tooltipComponent?.hideTooltip();
						this.isTooltipVisible = false;
						this.events.emit({ type: 'hidden', position: this.hostElementPosition });
					}),
					takeUntil(this.destroy$)
				)
				.subscribe();
    	}
	}

	private destroyTooltip(destroyInstantly = false): void {
		if(!this.isTooltipComponentDestroyed) {

			const tooltipVisibleAtStart = this.isTooltipVisible;

			if (tooltipVisibleAtStart) {
				this.events.emit({ type: 'hide', position: this.hostElementPosition });
			}

			timer(destroyInstantly ? 0 : this.destroyDelay ?? 0)
				.pipe(
					first(),
					filter(() => !this.isTooltipComponentDestroyed),
					tap(() => {
						if (this.refToTooltipComponent) {
							this.appRef.detachView(this.refToTooltipComponent.hostView);
							this.refToTooltipComponent.destroy();
						}
					}),
					filter(() => tooltipVisibleAtStart),
					tap(() => this.events.emit({ type: 'hidden', position: this.hostElementPosition }))
				)
				.subscribe();
		}
	}

    private getTooltipData(): TooltipDto {
        // Map tooltip-options:
    	const mergedOptions = this.getMergedTooltipOptions();

        // Set the data property of the component instance.
        return {
            tooltipStr: this.tooltipStr,
            tooltipHtml: this.tooltipHtml,
            tooltipTemplate: this.tooltipTemplate,
            hostElement: this.hostElementRef.nativeElement,
            hostElementPosition: this.hostElementPosition,
            options: mergedOptions
          };
    }

    private getMergedTooltipOptions(): TooltipOptions {
    	// Merge options: the priority order is as follows:        
		// 1. Individual options passed via @Input
		// 2. The options-object passed via @Input
        // 3. Options passed via module
		// 4. The default options
    	return Object.assign({}, defaultOptions, this.initOptions || {}, this.options, this.collectedOptions);
	}

    ngOnDestroy(): void {
		this.clearTimeouts$.next();
		this.clearTimeouts$.unsubscribe();
		this.destroy$.next();
		this.destroy$.unsubscribe();
		this.destroyTooltip(true);    
    }
}

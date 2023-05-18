import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseTooltipDirective } from './base-tooltip.directive';
import { TooltipComponent } from './tooltip.component';
import { TooltipOptions } from './options.interface';
import { TooltipOptionsService } from './options.service';
import { TooltipStrDirective } from './tooltip-str.directive';
import { TooltipHtmlDirective } from './tooltip-html.directive';
import { TooltipTemplateDirective } from './tooltip-template.directive';

@NgModule({
    declarations: [
        TooltipStrDirective,
        TooltipHtmlDirective,
        TooltipTemplateDirective,
        TooltipComponent
    ],
    imports: [
        CommonModule
    ],
    exports: [  
        TooltipStrDirective,
        TooltipHtmlDirective,
        TooltipTemplateDirective,      
    ]
})
export class TooltipModule {

    static forRoot(initOptions: TooltipOptions): ModuleWithProviders<TooltipModule> {
        return {
            ngModule: TooltipModule,
            providers: [
                {
                    provide: TooltipOptionsService,
                    useValue: initOptions
                }
            ]
        };
    }
}

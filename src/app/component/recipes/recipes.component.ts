import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {Observable} from 'rxjs';
import {ListManagerService} from '../../core/list/list-manager.service';
import {List} from '../../model/list/list';
import {MdDialog, MdSnackBar} from '@angular/material';
import {ListNamePopupComponent} from '../popup/list-name-popup/list-name-popup.component';
import {DataService} from '../../core/api/data.service';
import {Recipe} from '../../model/list/recipe';
import {I18nToolsService} from '../../core/i18n-tools.service';
import {GarlandToolsService} from '../../core/api/garland-tools.service';
import {TranslateService} from '@ngx-translate/core';
import {Router} from '@angular/router';
import {HtmlToolsService} from '../../core/html-tools.service';
import {ListService} from '../../core/firebase/list.service';
import {SearchFilter} from '../../model/search/search-filter.interface';

@Component({
    selector: 'app-recipes',
    templateUrl: './recipes.component.html',
    styleUrls: ['./recipes.component.scss']
})
export class RecipesComponent implements OnInit {

    recipes: Recipe[] = [];

    @ViewChild('filter')
    filterElement: ElementRef;

    filters: SearchFilter[] = [
        {
            enabled: false,
            minMax: true,
            select: false,
            value: {
                min: 0,
                max: 999
            },
            name: 'filters/ilvl',
            filterName: 'ilvl'
        },
        {
            enabled: false,
            minMax: true,
            select: false,
            value: {
                min: 0,
                max: 70
            },
            name: 'filters/lvl',
            filterName: 'lvl'
        },
        {
            enabled: false,
            minMax: true,
            select: false,
            value: {
                min: 0,
                max: 70
            },
            name: 'filters/craft_lvl',
            filterName: 'clvl'
        },
        {
            enabled: false,
            minMax: false,
            select: true,
            value: 0,
            values: this.gt.getJobs().filter(job => job.isJob !== undefined),
            name: 'filters/worn_by',
            filterName: 'jobCategories'
        },
        {
            enabled: false,
            minMax: false,
            select: true,
            value: 0,
            values: this.gt.getJobs().filter(job => job.category.indexOf('Hand') > -1),
            name: 'filters/crafted_by',
            filterName: ''
        },
    ];

    query: string;

    lists: Observable<List[]> = this.listService.getAll();

    loading = false;

    constructor(private resolver: ListManagerService, private db: DataService,
                private snackBar: MdSnackBar, private dialog: MdDialog,
                private i18n: I18nToolsService, private gt: GarlandToolsService,
                private translator: TranslateService, private router: Router,
                private htmlTools: HtmlToolsService, private listService: ListService) {
    }

    ngOnInit() {
        Observable.fromEvent(this.filterElement.nativeElement, 'keyup')
            .debounceTime(500)
            .distinctUntilChanged()
            .subscribe(() => {
                this.doSearch();
            });

    }

    doSearch(): void {
        this.loading = true;
        let hasFilters = false;
        this.filters.forEach(f => hasFilters = hasFilters || f.enabled);
        if ((this.query === undefined || this.query === '') && !hasFilters) {
            this.recipes = [];
            this.loading = false;
            return;
        }
        this.db.searchRecipe(this.query, this.filters).subscribe(results => {
            this.recipes = results;
            this.loading = false;
        });
    }

    getJob(id: number): any {
        return this.gt.getJob(id);
    }

    getStars(nb: number): string {
        return this.htmlTools.generateStars(nb);
    }


    /**
     * Adds a recipe to a given list
     *
     * @param {Recipe} recipe The recipe we want to add
     * @param {List} list The list we want to add the recipe to
     * @param {string} key The database key of the list
     * @param {string} amount The amount of items we want to add, this is handled as a string because a string is expected from the template
     */
    addRecipe(recipe: Recipe, list: List, key: string, amount: string): void {
        this.resolver.addToList(recipe.itemId, list, recipe.recipeId, +amount)
            .subscribe(updatedList => {
                this.listService.update(key, updatedList).then(() => {
                    this.snackBar.open(
                        `${this.i18n.getName(recipe.name)} added to list ${list.name}`,
                        this.translator.instant('Open'),
                        {
                            duration: 10000,
                            extraClasses: ['snack']
                        }
                    ).onAction().subscribe(() => {
                        this.listService.getRouterPath(key).subscribe(path => {
                            this.router.navigate(path);
                        });
                    });
                });
            }, err => console.error(err));
    }

    addToNewList(recipe: any, amount: string): void {
        this.dialog.open(ListNamePopupComponent).afterClosed().subscribe(res => {
            const list = new List();
            list.name = res;
            this.listService.push(list).then(l => {
                this.addRecipe(recipe, list, l.key, amount);
            });
        });
    }

}

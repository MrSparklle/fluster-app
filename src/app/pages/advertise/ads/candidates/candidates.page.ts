import {Component, OnInit} from '@angular/core';
import {LoadingController, MenuController, NavController, Platform, ToastController} from '@ionic/angular';
import {HttpErrorResponse} from '@angular/common/http';

import {TranslateService} from '@ngx-translate/core';

import {forkJoin} from 'rxjs';

import {AbstractAdsPage} from '../abstract-ads';

// Model
import {User} from '../../../../services/model/user/user';
import {Item} from '../../../../services/model/item/item';

// Utils
import {Comparator} from '../../../../services/core/utils/utils';

// Services
import {AdsService} from '../../../../services/advertise/ads-service';
import {NewItemService} from '../../../../services/advertise/new-item-service';
import {GoogleAnalyticsNativeService} from '../../../../services/native/analytics/google-analytics-native-service';
import {LocalFilesService} from '../../../../services/native/localfiles/local-files-service';
import {CandidatesService} from '../../../../services/advertise/candidates-service';
import {StorageService} from '../../../../services/core/localstorage/storage-service';
import {UserSessionService} from '../../../../services/core/user/user-session-service';
import {NavParamsService} from '../../../../services/core/navigation/nav-params-service';

@Component({
    selector: 'app-candidates',
    templateUrl: './candidates.page.html',
    styleUrls: ['./candidates.page.scss'],
})
export class CandidatesPage extends AbstractAdsPage implements OnInit {

    item: Item;

    user: User;

    candidates: User[];

    loaded: boolean = false;

    private pageIndex: number = 0;
    private lastPageReached: boolean = false;

    displayFirstAccessMsg: boolean = false;
    fadeFirstAccessMsg: boolean = false;

    constructor(protected platform: Platform,
                protected navController: NavController,
                private menuController: MenuController,
                protected loadingController: LoadingController,
                protected toastController: ToastController,
                protected translateService: TranslateService,
                private storageService: StorageService,
                protected adsService: AdsService,
                protected newItemService: NewItemService,
                protected googleAnalyticsNativeService: GoogleAnalyticsNativeService,
                protected localFilesService: LocalFilesService,
                protected candidatesService: CandidatesService,
                private userSessionService: UserSessionService,
                private navParamsService: NavParamsService) {
        super(platform, loadingController, navController, toastController, translateService, googleAnalyticsNativeService, adsService, newItemService, localFilesService, candidatesService);

        this.gaTrackView(this.platform, this.googleAnalyticsNativeService, this.RESOURCES.GOOGLE.ANALYTICS.TRACKER.VIEW.ADS.CANDIDATES.CANDIDATES);
    }

    ngOnInit() {
        this.user = this.userSessionService.getUser();

        this.item = this.adsService.getSelectedItem();

        this.firstAccessMsg();

        if (!this.hasItem()) {
            this.starredCandidates = null;
            this.candidates = null;
            this.loaded = true;
        } else {
            const promises = new Array();
            promises.push(this.findCandidates());
            promises.push(this.findStarredCandidates());

            forkJoin(promises).subscribe(
                (data: any) => {
                    this.loaded = true;
                });
        }
    }

    ionViewWillEnter() {
        this.enableMenu(this.menuController, false, true);
    }

    private findCandidates(): Promise<{}> {
        return new Promise((resolve) => {
            this.candidatesService.findCandidates(this.item, this.pageIndex).then((results: User[]) => {
                if (Comparator.isEmpty(this.candidates)) {
                    this.candidates = new Array();
                }

                this.candidates = this.candidates.concat(results);

                this.pageIndex += 1;

                if (Comparator.isEmpty(results) || results.length < this.RESOURCES.API.PAGINATION.COMMON) {
                    this.lastPageReached = true;
                }

                resolve();
            }, (errorResponse: HttpErrorResponse) => {
                this.candidates = new Array();
                this.lastPageReached = true;

                resolve();
            });
        });
    }

    findNextCandidates(event) {
        this.findCandidates().then(() => {
            event.target.complete();
        });
    }

    starredCandidateCallCallback = (starredCandidateId: string): Promise<{}> => {
        return new Promise((resolve) => {
            if (!Comparator.isStringEmpty(starredCandidateId)) {
                if (Comparator.isEmpty(this.starredCandidates)) {
                    this.starredCandidates = new Array();
                }

                this.starredCandidates.push(starredCandidateId);
            }
            resolve();
        });
    }

    navigateToDetail(candidate: User) {
        this.navParamsService.setCandidateDetailsNavParams({
            item: this.item,
            candidate: candidate,
            starred: this.isCandidateStarred(candidate),
            starredCandidateCallCallback: this.starredCandidateCallCallback
        });

        this.navController.navigateForward('/candidate-details');
    }

    isLastPageReached(): boolean {
        return this.lastPageReached;
    }

    hasCandidates(): boolean {
        return Comparator.hasElements(this.candidates);
    }

    isCandidateStarred(candidate: User): boolean {
        return Comparator.hasElements(this.starredCandidates) && this.starredCandidates.indexOf(candidate._id) > -1;
    }

    // Message

    private firstAccessMsg() {
        this.storageService.retrieveRoomatesWereSeenOnce().then((itemsSeensOnce: boolean) => {
            if (itemsSeensOnce == null || !itemsSeensOnce) {
                this.displayFirstAccessMsg = true;

                setTimeout(() => {
                    this.fadeFirstAccessMsg = true;

                    setTimeout(() => {
                        this.displayFirstAccessMsg = false;
                    }, this.RESOURCES.TIME_OUT.NOTIFICATION.FADE_OUT);
                }, this.RESOURCES.TIME_OUT.NOTIFICATION.DISPLAY_FIRST_MSG);

                this.storageService.saveRoomatesWereSeenOnce(true).then(() => {
                    // Do nothing
                });
            }
        });
    }

    closeFirstAccessMsg() {
        this.displayFirstAccessMsg = false;
    }

}

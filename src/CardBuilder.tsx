import { Attachment, CardAction, HeroCard, Thumbnail, CardImage } from 'botframework-directlinejs';
import * as AdaptiveCardSchema from 'adaptivecards/lib/schema';
import { BotFrameworkCardAction } from './AdaptiveCardContainer';

interface IVersionedCard extends AdaptiveCardSchema.IAdaptiveCard {
    version: string;
}

export class AdaptiveCardBuilder {
    public container: AdaptiveCardSchema.IContainer;
    public card: AdaptiveCardSchema.IAdaptiveCard;

    constructor() {
        this.container = {
            type: "Container",
            items: []
        };

        this.card = {
            type: "AdaptiveCard",
            version: "0.5",
            body: [this.container]
        } as IVersionedCard;
    }

    addColumnSet(sizes: number[], container = this.container) {
        const columnSet: AdaptiveCardSchema.IColumnSet = {
            type: 'ColumnSet',
            columns: sizes.map((size): AdaptiveCardSchema.IColumn => {
                return {
                    type: 'Column',
                    size: size.toString(),
                    items: []
                }
            })
        };
        container.items.push(columnSet);
        return columnSet.columns;
    }

    addItems(elements: AdaptiveCardSchema.ICardElement[], container = this.container) {
        container.items.push.apply(container.items, elements);
    }

    addTextBlock(text: string, template: Partial<AdaptiveCardSchema.ITextBlock>, container = this.container) {
        if (typeof text !== 'undefined') {
            const textblock: AdaptiveCardSchema.ITextBlock = {
                type: "TextBlock",
                text: text,
                ...template
            };
            container.items.push(textblock);
        }
    }

    addButtons(buttons: CardAction[]) {
        if (buttons) {
            this.card.actions = buttons.map(AdaptiveCardBuilder.addCardAction);
        }
    }

    private static addCardAction(cardAction: CardAction) {
        if (cardAction.type === 'imBack' || cardAction.type === 'postBack') {
            const botFrameworkCardAction: BotFrameworkCardAction = { __isBotFrameworkCardAction: true, ...cardAction };
            return {
                title: cardAction.title,
                type: "Action.Submit",
                data: botFrameworkCardAction
            };
        }
        else {
            return {
                type: 'Action.OpenUrl',
                title: cardAction.title,
                url: cardAction.type === 'call' ? 'tel:' + cardAction.value : cardAction.value
            };
        }
    }

    addCommon(content: ICommonContent) {
        this.addTextBlock(content.title, { size: "medium", weight: "bolder" });
        this.addTextBlock(content.subtitle, { isSubtle: true, wrap: true, separation: "none" });
        this.addTextBlock(content.text, { wrap: true });
        this.addButtons(content.buttons);
    }

    addImage(image: CardImage, container = this.container) {
        var img: AdaptiveCardSchema.IImage = {
            type: "Image",
            url: image.url,
            size: "stretch",
        };

        if (image.tap) {
            img.selectAction = AdaptiveCardBuilder.addCardAction(image.tap);
        }
        container.items.push(img);
    }

}

export interface ICommonContent {
    title?: string,
    subtitle?: string,
    text?: string,
    buttons?: CardAction[]
}

export const buildCommonCard = (content: ICommonContent): AdaptiveCardSchema.IAdaptiveCard => {
    if (!content) return null;

    const cardBuilder = new AdaptiveCardBuilder();
    cardBuilder.addCommon(content)
    return cardBuilder.card;
};

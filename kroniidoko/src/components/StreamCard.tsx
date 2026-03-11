import { FunctionalComponent } from "preact";
import "./StreamCard.css";

interface StreamCardProps {
    title: string;
    dateStr: string;
    id: string;
    type?: string;
    tailX?: number;
}

const StreamCard: FunctionalComponent<StreamCardProps> = ({ title, dateStr, id, type, tailX }) => {
    const hasValidLink = id && id !== 'undefined' && type !== 'placeholder';

    return (
        <div class="stream-card-container">
            <div class="stream-card-bubble">
                <h3 class="serif section-header">UPCOMING STREAM</h3>
                <h3 class="serif">
                    {hasValidLink ? (
                        <a href={"https://youtube.com/watch?v=" + id} target="_blank" rel="noopener noreferrer">
                            {title}
                        </a>
                    ) : (
                        <span class="disabled-link">{title}</span>
                    )}
                </h3>
                <h3 class="serif">{dateStr}</h3>
                {tailX !== undefined && (
                    <div
                        class="bubble-tail"
                        style={{ left: `${tailX}%` }}
                    />
                )}
            </div>
        </div>
    );
};

export default StreamCard;

import { FunctionalComponent } from "preact";
import "./StreamCard.css";

interface StreamCardProps {
    title: string;
    dateStr: string;
    id: string;
    tailX?: number;
}

const StreamCard: FunctionalComponent<StreamCardProps> = ({ title, dateStr, id, tailX }) => {
    return (
        <div class="stream-card-container">
            <div class="stream-card-bubble">
                <h3 class="serif section-header">UPCOMING STREAM</h3>
                <h3 class="serif">
                    <a href={"https://youtube.com/watch?v=" + id} target="_blank" rel="noopener noreferrer">
                        {title}
                    </a>
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

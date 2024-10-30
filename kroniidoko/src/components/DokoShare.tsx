import Button from 'preact-material-components/Button';
import Dialog from 'preact-material-components/Dialog';
import 'preact-material-components/Button/style.css';
import 'preact-material-components/Dialog/style.css';
import { Component } from 'preact';
import Doko from './Doko';
import KroniiImg from '/src/assets/kronii.png';
import Hourglass from '/src/assets/hourglass-not-done.png';

type DSProps = {}
type DSState = {
    fileData: string,
    name: string,
    quote: string
};
export default class DokoShare extends Component<DSProps, DSState> {

    constructor() {
        super();
        this.state = {
            fileData: Hourglass,
            name: "",
            quote: ""
        };
    }

    prepDlg: any;
    shareDlg: any;
    shareQuote: any;
    render() {
        // console.log("render")
        // console.log(this.state)
        return (
            <>
                <Button class="serif" primary={true} raised={true} onClick={() => {
                    this.prepDlg.MDComponent.show();
                }}>{"i miss kronii..."}</Button>
                <Dialog ref={prepDlg => { this.prepDlg = prepDlg; }} onAccept={this.handlePrepSubmit}>
                    <Dialog.Header><h3>i miss kronii...</h3></Dialog.Header>
                    <Dialog.Body>
                        <div>
                            <p>Upload a profile image:</p>
                            <input type="file" onChange={this.handleImageChange}></input>
                            <p>Your name?</p>
                            <input onChange={this.handleNameChange}></input>
                            <p>Anything you have to say?</p>
                            <input onChange={this.handleQuoteChange}></input>
                        </div>
                    </Dialog.Body>
                    <Dialog.Footer>
                        <Dialog.FooterButton cancel={true}>Cancel</Dialog.FooterButton>
                        <Dialog.FooterButton accept={true}>Submit</Dialog.FooterButton>
                    </Dialog.Footer>
                </Dialog>
                <Dialog ref={shareDlg => { this.shareDlg = shareDlg; }}>
                    <Dialog.Header>kronii doko?</Dialog.Header>
                    <Dialog.Body class="darkbg">
                        <div>
                            <img id="sharepfp" src={this.state.fileData} />
                            <h1 id="sharename" class="serif">{this.state.name}</h1>
                            {(this.state.quote)? 
                            (<p id="sharequote" ref={shareQuote => { this.shareQuote = shareQuote; }}>{this.state.quote}</p>) : (<></>)}
                            <br/>
                        </div>
                        <div>
                            <Doko next={false}/>
                            <p class="lowtext">kroniidoko.ayrl.in</p>
                        </div>
                        <img id="sharebg" src={KroniiImg}/>
                    </Dialog.Body>
                    <Dialog.Footer>
                        <Dialog.FooterButton onClick={this.handleSharePress}>Share Website</Dialog.FooterButton>
                        <Dialog.FooterButton cancel={true}>Done</Dialog.FooterButton>
                    </Dialog.Footer>
                </Dialog>
            </>
        );
    }

    handleImageChange = (event: any) => {
        this.setState({ fileData: URL.createObjectURL(event.target.files[0]) });
    }

    handleNameChange = (event: any) => {
        this.setState({ name: event.target.value });
    }

    handleQuoteChange = (event: any) => {
        this.setState({ quote: event.target.value });
    }

    handlePrepSubmit = () => {
        if(this.state.quote.length <= 150) {
            this.shareQuote.classList.add('beeg');
        } else {
            this.shareQuote.classList.remove('beeg');
        }
        this.shareDlg.MDComponent.show();
    }

    handleSharePress() {
        navigator.clipboard.writeText("https://kroniidoko.ayrl.in");
        console.log("Copied link to clipboard.");
    }
}
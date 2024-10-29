

export default function Logo(params: { id: string, color: string }) {
    return (
        <svg id={params.id} width="100%" height="100%" viewBox="0 0 879 297" version="1.1" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:square;stroke-linejoin:round;stroke-miterlimit:1.5;">
            <g transform="matrix(1,0,0,1,-488.609,-299.053)">
                <g id="clock">
                    <g transform="matrix(-3.28307,2.06003,-0.645135,-1.02815,3716.77,-735.358)">
                        <path d="M800,450C683.063,333.063 713.38,363.38 656.458,306.458" style="fill:none;stroke:rgb(255,220,145);stroke-width:1.39px;" />
                    </g>
                    <g id="Layer3" transform="matrix(0.43285,0.901466,-0.901466,0.43285,859.38,-465.955)">
                        <g transform="matrix(1.52028,-0.19301,-0.19301,1.52028,-318.734,-81.943)">
                            <path d="M788.478,450L684.75,553.727" style={"fill:none;stroke:" + params.color + ";stroke-width:3.01px;"} />
                        </g>
                        <g transform="matrix(1.32727,0,0,1.32727,-261.818,-153.575)">
                            <path d="M800,459.985L653.042,606.943" style={"fill:none;stroke:" + params.color + ";stroke-width:3.01px;"} />
                        </g>
                        <g transform="matrix(0.838313,0,0,0.838313,129.35,72.7594)">
                            <path d="M800,450L524.147,725.853" style={"fill:none;stroke:" + params.color + ";stroke-width:4.77px;"} />
                        </g>
                    </g>
                    <g id="Layer4" transform="matrix(0.809326,-0.58736,0.58736,0.809326,-111.773,555.691)">
                        <g transform="matrix(1,0,0,1,1.38183,-1.38183)">
                            <path d="M798.618,451.382L575.325,451.382" style={"fill:none;stroke:" + params.color + ";stroke-width:4px;"} />
                        </g>
                        <g transform="matrix(0.936777,0,0,1,51.8728,3.48395)">
                            <path d="M798.618,451.382L575.325,451.382" style={"fill:none;stroke:" + params.color + ";stroke-width:4.13px;"} />
                        </g>
                        <g transform="matrix(0.864257,0,0,1,109.789,-6.27356)">
                            <path d="M798.618,451.382L575.325,451.382" style={"fill:none;stroke:" + params.color + ";stroke-width:4.28px;"} />
                        </g>
                        <g transform="matrix(0.66622,0,0,1,267.945,-11.1897)">
                            <path d="M798.618,451.382L575.325,451.382" style={"fill:none;stroke:" + params.color + ";stroke-width:4.71px;"} />
                        </g>
                        <g transform="matrix(0.742459,0,0,1,207.058,8.34194)">
                            <path d="M798.618,451.382L575.325,451.382" style={"fill:none;stroke:" + params.color + ";stroke-width:4.54px;"} />
                        </g>
                    </g>
                    <circle cx="800" cy="450" r="143.542" style={"fill:none;stroke:" + params.color + ";stroke-width:4px;stroke-linecap:round;"} />
                    <g transform="matrix(1.22222,0,0,1.22222,-177.778,-100)">
                        <circle cx="800" cy="450" r="50.116" style={"fill:" + params.color + ";"} />
                    </g>
                </g>
            </g>
        </svg>
    )
}


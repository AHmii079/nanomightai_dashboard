import React from "react";
import "./Loader.css";

const Loader = ({ size = "medium", color = "#1a73e8" }) => {
    return (
        <div className="loader-container">
            <div
                className={`loader spinner-${size}`}
                style={{ borderTopColor: color }}
            ></div>
        </div>
    );
};

export default Loader;
